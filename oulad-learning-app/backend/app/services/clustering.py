"""
Dịch vụ phân cụm sinh viên bằng K-Means (k=4) kết hợp chuẩn hóa StandardScaler và giảm chiều PCA 2D.
Tự động gán nhãn cụm có ý nghĩa nghiệp vụ dựa trên đặc trưng trung bình của từng tâm cụm
và đối chiếu với nhãn cụm có sẵn (cluster_name) trong bộ dữ liệu.
"""

from pathlib import Path
from typing import Dict, List, Tuple
import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

from app.config import (
    KMEANS_FEATURE_COLUMNS,
    KMEANS_N_CLUSTERS,
    KMEANS_RANDOM_STATE,
    settings,
)

# 4 nhãn nghiệp vụ chuẩn theo yêu cầu đề tài
CLUSTER_LABELS = {
    "EARLY_DROPOUT": "Rời bỏ sớm",
    "DECLINING": "Suy giảm dần",
    "HARDWORKING_LOW_SCORE": "Chăm chỉ nhưng điểm thấp",
    "STABLE_GOOD": "Ổn định tốt",
}


def assign_business_labels_from_centroids(
    centroids_df: pd.DataFrame,
) -> Dict[int, str]:
    """
    Gán nhãn nghiệp vụ cho 4 cụm K-Means bằng cách phân tích giá trị đặc trưng trung bình
    tại tâm cụm (KHÔNG gán cứng theo số thứ tự 0, 1, 2, 3).

    Quy tắc phân tích tâm cụm:
    1. Cụm "Rời bỏ sớm": Tâm cụm có mức độ tương tác (log_total_clicks, active_days)
       và số bài nộp (total_assessments_submitted) thấp nhất.
    2. Cụm "Ổn định tốt": Trong 3 cụm còn lại, tâm cụm có tổ hợp điểm trọng số (weighted_score),
       số bài nộp và số ngày hoạt động cao nhất.
    3. Cụm "Chăm chỉ nhưng điểm thấp": Trong 2 cụm còn lại, cụm có tương tác VLE
       (total_clicks / active_days) cao hơn nhưng hiệu suất điểm trọng số chưa tối ưu.
    4. Cụm "Suy giảm dần": Cụm còn lại (có đăng ký và nộp một số bài đầu kỳ nhưng
       tương tác và số ngày hoạt động giảm thấp).

    Args:
        centroids_df: DataFrame chứa tọa độ tâm cụm ở thang đo gốc (sau inverse_transform).

    Returns:
        Dict ánh xạ từ chỉ số cụm (int) sang tên cụm nghiệp vụ (str).
    """
    remaining_indices = list(centroids_df.index)
    label_map: Dict[int, str] = {}

    # 1. Tìm cụm "Rời bỏ sớm": tổng chuẩn hóa của log_total_clicks + active_days + total_assessments_submitted thấp nhất
    activity_score = (
        centroids_df["log_total_clicks"].rank(pct=True)
        + centroids_df["active_days"].rank(pct=True)
        + centroids_df["total_assessments_submitted"].rank(pct=True)
    )
    early_dropout_idx = int(activity_score.loc[remaining_indices].idxmin())
    label_map[early_dropout_idx] = CLUSTER_LABELS["EARLY_DROPOUT"]
    remaining_indices.remove(early_dropout_idx)

    # 2. Tìm cụm "Ổn định tốt": điểm thành tích + mức độ duy trì học tập cao nhất trong 3 cụm còn lại
    excellence_score = (
        0.45 * centroids_df["weighted_score"].rank(pct=True)
        + 0.30 * centroids_df["total_assessments_submitted"].rank(pct=True)
        + 0.25 * centroids_df["active_days"].rank(pct=True)
    )
    stable_good_idx = int(excellence_score.loc[remaining_indices].idxmax())
    label_map[stable_good_idx] = CLUSTER_LABELS["STABLE_GOOD"]
    remaining_indices.remove(stable_good_idx)

    # 3. Giữa 2 cụm còn lại: cụm nào có lượng tương tác (active_days + log_total_clicks) cao hơn
    # là "Chăm chỉ nhưng điểm thấp", cụm kia là "Suy giảm dần"
    effort_score = (
        0.60 * centroids_df["active_days"]
        + 0.40 * centroids_df["total_clicks"] / 50.0
    )
    hardworking_idx = int(effort_score.loc[remaining_indices].idxmax())
    label_map[hardworking_idx] = CLUSTER_LABELS["HARDWORKING_LOW_SCORE"]
    remaining_indices.remove(hardworking_idx)

    # 4. Cụm cuối cùng là "Suy giảm dần"
    declining_idx = int(remaining_indices[0])
    label_map[declining_idx] = CLUSTER_LABELS["DECLINING"]

    return label_map


def train_and_save_clustering_model(
    df: pd.DataFrame, model_path: str = settings.model_path
) -> dict:
    """
    Huấn luyện pipeline gồm StandardScaler, KMeans (k=4) và PCA (2 chiều),
    sau đó lưu chung vào một file .pkl.

    Args:
        df: DataFrame chứa các cột KMEANS_FEATURE_COLUMNS.
        model_path: Đường dẫn lưu file .pkl.

    Returns:
        Dictionary chứa scaler, kmeans, pca, label_map và feature_columns.
    """
    feature_matrix = df[KMEANS_FEATURE_COLUMNS].values.astype(float)

    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(feature_matrix)

    kmeans = KMeans(
        n_clusters=KMEANS_N_CLUSTERS,
        random_state=KMEANS_RANDOM_STATE,
        n_init=15,
        max_iter=300,
    )
    kmeans.fit(scaled_features)

    pca = PCA(n_components=2, random_state=KMEANS_RANDOM_STATE)
    pca.fit(scaled_features)

    # Đưa tâm cụm về thang đo gốc để gán nhãn nghiệp vụ chính xác
    original_centroids = scaler.inverse_transform(kmeans.cluster_centers_)
    centroids_df = pd.DataFrame(original_centroids, columns=KMEANS_FEATURE_COLUMNS)
    label_map = assign_business_labels_from_centroids(centroids_df)

    artifact = {
        "scaler": scaler,
        "kmeans": kmeans,
        "pca": pca,
        "label_map": label_map,
        "feature_columns": KMEANS_FEATURE_COLUMNS,
    }

    target_path = Path(model_path)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, target_path)

    return artifact


def load_or_train_clustering_model(
    df: pd.DataFrame, model_path: str = settings.model_path
) -> dict:
    """
    Nạp mô hình phân cụm từ file .pkl nếu tồn tại và khớp danh sách cột đặc trưng;
    ngược lại tự động huấn luyện mới và lưu lại.

    Args:
        df: DataFrame dùng để huấn luyện nếu chưa có file model.
        model_path: Đường dẫn tới file model .pkl.

    Returns:
        Dictionary chứa mô hình đã nạp hoặc vừa huấn luyện.
    """
    target_path = Path(model_path)
    if target_path.exists():
        try:
            artifact = joblib.load(target_path)
            if artifact.get("feature_columns") == KMEANS_FEATURE_COLUMNS:
                return artifact
        except Exception:
            pass

    return train_and_save_clustering_model(df, model_path)


def normalize_original_cluster_name(raw_name: str) -> str:
    """
    Đồng bộ tên cụm có sẵn trong CSV ('Nguy cơ suy giảm dần' -> 'Suy giảm dần')
    để so sánh trực tiếp với nhãn K-Means (k=4).

    Args:
        raw_name: Chuỗi tên cụm có sẵn trong cột cluster_name.

    Returns:
        Tên cụm đã chuẩn hóa.
    """
    cleaned = str(raw_name).strip()
    if cleaned == "Nguy cơ suy giảm dần":
        return CLUSTER_LABELS["DECLINING"]
    return cleaned


def run_clustering_pipeline(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[dict]]:
    """
    Thực thi phân cụm K-Means (k=4) trên DataFrame, tính tọa độ PCA 2D,
    và giữ lại cột cluster_name gốc (trong original_cluster_name) để đối chiếu.

    Args:
        df: DataFrame đã làm sạch.

    Returns:
        Tuple gồm:
        - DataFrame đã gắn thêm kmeans_cluster_id, kmeans_cluster_name, pca_x, pca_y,
          original_cluster_name, cluster_match.
        - Danh sách thống kê chi tiết từng cụm.
    """
    result_df = df.copy()
    artifact = load_or_train_clustering_model(result_df)

    scaler: StandardScaler = artifact["scaler"]
    kmeans: KMeans = artifact["kmeans"]
    pca: PCA = artifact["pca"]
    label_map: Dict[int, str] = artifact["label_map"]

    feature_matrix = result_df[KMEANS_FEATURE_COLUMNS].values.astype(float)
    scaled_features = scaler.transform(feature_matrix)

    raw_cluster_ids = kmeans.predict(scaled_features)
    pca_coords = pca.transform(scaled_features)

    # Lưu lại nhãn cụm gốc từ CSV trước khi cập nhật/so sánh
    if "cluster_name" in result_df.columns:
        result_df["original_cluster_name"] = result_df["cluster_name"].astype(str)
    else:
        result_df["original_cluster_name"] = "Chưa có"

    if "cluster_id" in result_df.columns:
        result_df["original_cluster_id"] = result_df["cluster_id"].astype(int)
    else:
        result_df["original_cluster_id"] = -1

    result_df["kmeans_cluster_id"] = raw_cluster_ids.astype(int)
    result_df["kmeans_cluster_name"] = [
        label_map.get(int(cid), "Chưa phân loại") for cid in raw_cluster_ids
    ]

    # Đối chiếu kết quả giữa K-Means (k=4) và nhãn cụm gốc trong file
    normalized_orig = result_df["original_cluster_name"].apply(
        normalize_original_cluster_name
    )
    result_df["cluster_match"] = (
        normalized_orig == result_df["kmeans_cluster_name"]
    )

    result_df["pca_x"] = np.round(pca_coords[:, 0], 4)
    result_df["pca_y"] = np.round(pca_coords[:, 1], 4)

    # Thống kê theo từng cụm K-Means
    total_rows = max(len(result_df), 1)
    cluster_summaries: List[dict] = []

    for cid, cname in sorted(label_map.items(), key=lambda item: item[0]):
        sub = result_df[result_df["kmeans_cluster_id"] == cid]
        count = len(sub)
        cluster_summaries.append(
            {
                "cluster_id": int(cid),
                "cluster_name": cname,
                "student_count": int(count),
                "percentage": round((count / total_rows) * 100.0, 2),
                "avg_score": round(float(sub["avg_score"].mean()), 2)
                if count > 0
                else 0.0,
                "avg_weighted_score": round(float(sub["weighted_score"].mean()), 2)
                if count > 0
                else 0.0,
                "avg_clicks": round(float(sub["total_clicks"].mean()), 1)
                if count > 0
                else 0.0,
                "avg_active_days": round(float(sub["active_days"].mean()), 1)
                if count > 0
                else 0.0,
                "avg_assessments": round(
                    float(sub["total_assessments_submitted"].mean()), 2
                )
                if count > 0
                else 0.0,
                "agreement_with_original_pct": round(
                    float(sub["cluster_match"].mean() * 100.0), 2
                )
                if count > 0
                else 0.0,
            }
        )

    return result_df, cluster_summaries
