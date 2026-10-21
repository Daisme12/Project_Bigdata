"""
Dịch vụ khuyến nghị lộ trình học tập cá nhân hóa theo cụm K-Means và chỉ số hành vi của sinh viên.
Cấu hình tách biệt trong hằng số CLUSTER_RECOMMENDATION_CONFIG giúp dễ dàng mở rộng.
"""

from typing import Any, Dict, List

# Cấu hình chi tiết cho 4 cụm hành vi học tập
CLUSTER_RECOMMENDATION_CONFIG: Dict[str, Dict[str, Any]] = {
    "Rời bỏ sớm": {
        "cluster_description": (
            "Sinh viên có mức độ tương tác trên hệ thống VLE rất thấp hoặc gần như bằng 0, "
            "số ngày đăng nhập ít và thiếu nhiều bài kiểm tra định kỳ. Nguy cơ bỏ học giữa chừng ở mức báo động."
        ),
        "intervention_priority": "Khẩn cấp (Ưu tiên mức 1)",
        "micro_learning": [
            {
                "title": "Video khởi động nhanh: Tóm tắt kiến thức cốt lõi học phần trong 15 phút",
                "duration": "15 phút",
                "format": "Video tương tác",
                "focus_area": "Hệ thống hóa nền tảng để bắt nhịp lại môn học mà không bị quá tải.",
            },
            {
                "title": "Infographic: Lộ trình vượt qua môn học với 30 phút mỗi ngày",
                "duration": "10 phút",
                "format": "Tài liệu trực quan",
                "focus_area": "Xây dựng lại thói quen đăng nhập VLE tối thiểu 3 ngày/tuần.",
            },
            {
                "title": "Podcast/Audio: Giải đáp các rào cản tâm lý và cách xin gia hạn bài tập",
                "duration": "12 phút",
                "format": "Audio hướng dẫn",
                "focus_area": "Kết nối lại với cố vấn học tập và nắm quy chế hỗ trợ sinh viên.",
            },
        ],
        "supplementary_exercises": [
            {
                "title": "Bộ 10 câu hỏi trắc nghiệm chẩn đoán lỗ hổng kiến thức cơ bản",
                "difficulty": "Cơ bản",
                "estimated_time": "15 phút",
                "objective": "Đánh giá nhanh phần kiến thức đã lỡ để gợi ý bài đọc ngắn tương ứng.",
            },
            {
                "title": "Bài tập thực hành có hướng dẫn từng bước (Step-by-step Walkthrough)",
                "difficulty": "Cơ bản",
                "estimated_time": "20 phút",
                "objective": "Hoàn thành ít nhất 1 bài nộp TMA/CMA để kích hoạt lại tiến độ.",
            },
        ],
        "weekly_goals": [
            "Đăng nhập vào hệ thống VLE tối thiểu 3 ngày trong tuần này (mỗi lần 20 phút).",
            "Hoàn thành 1 bài kiểm tra ngắn (Quiz) hoặc bài tập bổ trợ cơ bản.",
            "Phản hồi email của Cố vấn học tập để xác nhận kế hoạch học bù.",
        ],
        "email_subject_template": "[KHẨN] Hỗ trợ khôi phục lộ trình học tập - Sinh viên #{id_student}",
        "email_body_template": (
            "Chào bạn (Mã SV: {id_student}),\n\n"
            "Hệ thống Phân tích Học tập OULAD ghi nhận mức độ tương tác của bạn hiện đang ở nhóm "
            "'{cluster_name}' với điểm rủi ro là {risk_score}/100 (Mức: {risk_level}).\n"
            "Thông số hiện tại của bạn:\n"
            "- Số ngày hoạt động trên hệ thống: {active_days} ngày\n"
            "- Tổng số lượt tương tác (clicks): {total_clicks} lượt\n"
            "- Số bài đánh giá đã nộp: {total_assessments_submitted} bài (Điểm TB: {avg_score}/100)\n\n"
            "Chúng tôi hiểu bạn có thể đang gặp khó khăn về thời gian hoặc khối lượng kiến thức. "
            "Thay vì phải đọc lại toàn bộ giáo trình, hệ thống đã thiết kế riêng cho bạn gói Micro-learning "
            "15 phút/ngày:\n"
            "1. Xem video tóm tắt cốt lõi học phần (15 phút).\n"
            "2. Làm bộ 10 câu hỏi chẩn đoán cơ bản để lấy lại nhịp học.\n"
            "3. Đặt mục tiêu đăng nhập 3 ngày/tuần và hoàn thành 1 bài đánh giá kế tiếp.\n\n"
            "Nếu bạn cần gia hạn nộp bài hoặc tư vấn 1-1, vui lòng phản hồi trực tiếp email này.\n\n"
            "Trân trọng,\n"
            "Ban Cố vấn Học tập OULAD"
        ),
    },
    "Suy giảm dần": {
        "cluster_description": (
            "Sinh viên khởi đầu môn học khá tốt nhưng tần suất truy cập VLE, thảo luận diễn đàn "
            "và tiến độ làm bài kiểm tra đang chững lại rõ rệt theo thời gian."
        ),
        "intervention_priority": "Cao (Ưu tiên mức 2)",
        "micro_learning": [
            {
                "title": "Flashcards ôn tập nhanh các chủ đề giữa kỳ (Spaced Repetition)",
                "duration": "12 phút",
                "format": "Thẻ ghi nhớ số",
                "focus_area": "Củng cố kiến thức các tuần gần đây thông qua cơ chế lặp lại ngắt quãng.",
            },
            {
                "title": "Video phân tích các lỗi sai phổ biến trong bài đánh giá giữa kỳ",
                "duration": "18 phút",
                "format": "Video bài giảng ngắn",
                "focus_area": "Khắc phục điểm nghẽn khiến điểm trọng số (weighted score) bị giảm.",
            },
            {
                "title": "Checklist quản lý thời gian theo phương pháp Pomodoro cho sinh viên từ xa",
                "duration": "8 phút",
                "format": "Hướng dẫn thực hành",
                "focus_area": "Duy trì nhịp độ học đều đặn thay vì học dồn sát hạn nộp.",
            },
        ],
        "supplementary_exercises": [
            {
                "title": "Bài tập tự luyện Quiz tương tác cho học phần hiện tại",
                "difficulty": "Trung bình",
                "estimated_time": "25 phút",
                "objective": "Nâng tỷ lệ tương tác Quiz và chuẩn bị cho bài thi trọng số lớn.",
            },
            {
                "title": "Thử thách thảo luận ngắn trên Forum học tập (1 chủ đề/tuần)",
                "difficulty": "Trung bình",
                "estimated_time": "15 phút",
                "objective": "Tăng sự gắn kết với nhóm học tập và giảng viên hướng dẫn.",
            },
        ],
        "weekly_goals": [
            "Duy trì tối thiểu 4 ngày hoạt động/tuần trên hệ thống VLE.",
            "Hoàn thành 1 bài luyện Quiz và đối chiếu kỹ phần giải thích đáp án.",
            "Đặt lịch nhắc nhở trước hạn nộp bài đánh giá tiếp theo ít nhất 3 ngày.",
        ],
        "email_subject_template": "[Nhắc nhở học tập] Duy trì phong độ và lộ trình tuần mới - SV #{id_student}",
        "email_body_template": (
            "Chào bạn (Mã SV: {id_student}),\n\n"
            "Hệ thống ghi nhận bạn đã hoàn thành {total_assessments_submitted} bài đánh giá với điểm trung bình "
            "{avg_score}/100. Tuy nhiên, nhịp độ hoạt động gần đây của bạn có dấu hiệu chững lại "
            "(Nhóm phân cụm: '{cluster_name}', Điểm rủi ro: {risk_score}/100).\n\n"
            "Thông số hiện tại:\n"
            "- Số ngày hoạt động: {active_days} ngày | Tổng lượt tương tác: {total_clicks} clicks\n"
            "- Điểm trung bình: {avg_score} | Điểm trọng số: {weighted_score}\n\n"
            "Gợi ý lộ trình tuần này dành riêng cho bạn:\n"
            "1. Dành 12 phút ôn tập bộ Flashcards tổng hợp kiến thức trọng tâm.\n"
            "2. Thực hành bài Quiz tự luyện (25 phút) để cải thiện điểm trọng số.\n"
            "3. Duy trì đăng nhập ít nhất 4 ngày/tuần để không bị dồn bài vào cuối kỳ.\n\n"
            "Chúc bạn giữ vững tinh thần và đạt kết quả tốt!\n"
            "Ban Cố vấn Học tập OULAD"
        ),
    },
    "Chăm chỉ nhưng điểm thấp": {
        "cluster_description": (
            "Sinh viên rất tích cực truy cập học liệu và hoạt động nhiều ngày trên VLE, "
            "nhưng điểm trung bình hoặc điểm trọng số chưa tương xứng với thời gian bỏ ra."
        ),
        "intervention_priority": "Trung bình - Cần tối ưu phương pháp học",
        "micro_learning": [
            {
                "title": "Hướng dẫn kỹ thuật làm bài đánh giá (Assessment Rubric & Chiến thuật làm bài)",
                "duration": "20 phút",
                "format": "Video chuyên đề",
                "focus_area": "Hiểu rõ tiêu chí chấm điểm để chuyển hóa thời gian đọc tài liệu thành điểm số thực tế.",
            },
            {
                "title": "Sơ đồ tư duy (Mindmap) liên kết lý thuyết với câu hỏi vận dụng",
                "duration": "15 phút",
                "format": "Tài liệu Mindmap",
                "focus_area": "Chuyển từ đọc thụ động (Content clicks cao) sang tư duy giải quyết vấn đề.",
            },
            {
                "title": "Video chữa mẫu bài tập đạt điểm tối đa (Exemplar Answer Walkthrough)",
                "duration": "18 phút",
                "format": "Video phân tích mẫu",
                "focus_area": "Cách trình bày lập luận và tránh mất điểm ở các câu hỏi trọng số lớn.",
            },
        ],
        "supplementary_exercises": [
            {
                "title": "Bộ đề luyện tập mô phỏng theo cấu trúc đề thi chuẩn kèm lời giải chi tiết",
                "difficulty": "Trung bình - Khá",
                "estimated_time": "35 phút",
                "objective": "Rèn kỹ năng phân bổ thời gian và kiểm tra mức độ hiểu sâu.",
            },
            {
                "title": "Bài tập tự đánh giá (Self-Assessment) đối chiếu theo Rubric chấm điểm",
                "difficulty": "Trung bình",
                "estimated_time": "20 phút",
                "objective": "Thu hẹp khoảng cách giữa điểm trung bình ({avg_score}) và điểm trọng số ({weighted_score}).",
            },
        ],
        "weekly_goals": [
            "Giảm thời gian đọc lướt tài liệu thụ động, dành 60% thời gian cho việc làm Quiz và giải đề.",
            "Xem kỹ video phân tích tiêu chí chấm điểm (Rubric) trước khi nộp bài tiếp theo.",
            "Đặt ít nhất 1 câu hỏi về phần kiến thức chưa rõ trên Forum để được giảng viên giải đáp.",
        ],
        "email_subject_template": "[Cố vấn học tập] Tối ưu phương pháp học & bứt phá điểm số - SV #{id_student}",
        "email_body_template": (
            "Chào bạn (Mã SV: {id_student}),\n\n"
            "Hệ thống rất ghi nhận sự nỗ lực của bạn với {active_days} ngày hoạt động và {total_clicks} lượt tương tác "
            "trên hệ thống học tập! Hiện tại bạn thuộc nhóm '{cluster_name}' "
            "(Điểm TB: {avg_score}, Điểm trọng số: {weighted_score}, Điểm rủi ro: {risk_score}/100).\n\n"
            "Để giúp bạn chuyển hóa sự chăm chỉ thành điểm số cao hơn, hệ thống gợi ý bạn điều chỉnh "
            "chiến lược học tập trong tuần này:\n"
            "1. Xem video 'Phân tích tiêu chí chấm điểm (Assessment Rubric)' (20 phút).\n"
            "2. Chuyển trọng tâm từ đọc tài liệu thuần túy ({content_clicks} lượt xem nội dung) sang làm bài luyện Quiz "
            "có giải thích chi tiết.\n"
            "3. Tham khảo bài giải mẫu để cải thiện điểm trọng số ở các bài thi sắp tới.\n\n"
            "Nỗ lực của bạn rất đáng khen ngợi — chỉ cần điều chỉnh đúng phương pháp, kết quả chắc chắn sẽ bứt phá!\n\n"
            "Trân trọng,\n"
            "Ban Cố vấn Học tập OULAD"
        ),
    },
    "Ổn định tốt": {
        "cluster_description": (
            "Sinh viên duy trì kỷ luật học tập xuất sắc, tương tác đều đặn trên cả học liệu, "
            "quiz lẫn diễn đàn, đồng thời đạt điểm số và tiến độ nộp bài ấn tượng."
        ),
        "intervention_priority": "Duy trì & Phát triển nâng cao",
        "micro_learning": [
            {
                "title": "Chuyên đề nâng cao (Masterclass): Ứng dụng thực tiễn & Case Study chuyên sâu",
                "duration": "25 phút",
                "format": "Bài giảng chuyên sâu",
                "focus_area": "Mở rộng kiến thức vượt khung chương trình chuẩn để hướng tới điểm Distinction.",
            },
            {
                "title": "Tài liệu hướng dẫn kỹ năng Peer-Mentoring & Thảo luận học thuật",
                "duration": "15 phút",
                "format": "Tài liệu đọc",
                "focus_area": "Nâng cao khả năng phản biện và dẫn dắt thảo luận trên diễn đàn học tập.",
            },
        ],
        "supplementary_exercises": [
            {
                "title": "Bài tập thử thách nâng cao (Challenge Problem Set - Mức Distinction)",
                "difficulty": "Nâng cao",
                "estimated_time": "40 phút",
                "objective": "Chinh phục mức điểm xuất sắc (>85) trong kỳ đánh giá cuối kỳ.",
            },
            {
                "title": "Hoạt động hỗ trợ giải đáp 2 câu hỏi của bạn học trên Forum",
                "difficulty": "Vận dụng cao",
                "estimated_time": "20 phút",
                "objective": "Củng cố kiến thức sâu sắc hơn thông qua việc giải thích lại cho người khác.",
            },
        ],
        "weekly_goals": [
            "Duy trì nhịp độ học tập ổn định và hoàn thành sớm các bài đánh giá trước hạn.",
            "Thử sức với 1 bài tập tình huống nâng cao (Case Study).",
            "Tham gia đóng góp ý kiến chuyên môn hoặc hỗ trợ thành viên khác trên Forum.",
        ],
        "email_subject_template": "[Khen ngợi & Lộ trình nâng cao] Chúc mừng kết quả học tập ấn tượng - SV #{id_student}",
        "email_body_template": (
            "Chào bạn (Mã SV: {id_student}),\n\n"
            "Chúc mừng bạn đã duy trì thành tích học tập rất ấn tượng! Hệ thống ghi nhận bạn thuộc nhóm "
            "'{cluster_name}' với điểm rủi ro rất thấp ({risk_score}/100 - Mức: {risk_level}).\n\n"
            "Thành tích nổi bật của bạn:\n"
            "- Điểm trung bình: {avg_score}/100 | Điểm trọng số: {weighted_score}/100\n"
            "- Số bài đánh giá đã hoàn thành: {total_assessments_submitted} bài\n"
            "- Số ngày hoạt động tích cực: {active_days} ngày ({total_clicks} lượt tương tác)\n\n"
            "Lộ trình phát triển nâng cao tuần này dành cho bạn:\n"
            "1. Khám phá chuyên đề Case Study nâng cao (25 phút) để hướng tới xếp loại Xuất sắc (Distinction).\n"
            "2. Thử sức với bộ câu hỏi vận dụng cao (Challenge Problem Set).\n"
            "3. Chia sẻ kinh nghiệm học tập cùng các bạn trên diễn đàn môn học.\n\n"
            "Chúc bạn tiếp tục gặt hái kết quả xuất sắc!\n"
            "Ban Cố vấn Học tập OULAD"
        ),
    },
}


def build_personalized_pathway(student_row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sinh lộ trình học tập cá nhân hóa và nội dung email nhắc nhở dựa trên cụm K-Means
    cùng các chỉ số thực tế của từng sinh viên.

    Args:
        student_row: Dictionary chứa thông tin một dòng sinh viên từ DataFrame đã xử lý.

    Returns:
        Dictionary chứa đầy đủ khuyến nghị học tập, mục tiêu tuần và email xem trước.
    """
    cluster_name = str(
        student_row.get("kmeans_cluster_name")
        or student_row.get("cluster_name")
        or "Suy giảm dần"
    )
    if cluster_name == "Nguy cơ suy giảm dần":
        cluster_name = "Suy giảm dần"

    config = CLUSTER_RECOMMENDATION_CONFIG.get(
        cluster_name, CLUSTER_RECOMMENDATION_CONFIG["Suy giảm dần"]
    )

    fmt_context = {
        "id_student": student_row.get("id_student", 0),
        "cluster_name": cluster_name,
        "risk_score": round(float(student_row.get("risk_score", 0.0)), 2),
        "risk_level": student_row.get("risk_level_standard", "Trung bình"),
        "avg_score": round(float(student_row.get("avg_score", 0.0)), 2),
        "weighted_score": round(float(student_row.get("weighted_score", 0.0)), 2),
        "active_days": int(student_row.get("active_days", 0)),
        "total_clicks": int(student_row.get("total_clicks", 0)),
        "content_clicks": int(student_row.get("content_clicks", 0)),
        "quiz_clicks": int(student_row.get("quiz_clicks", 0)),
        "forum_clicks": int(student_row.get("forum_clicks", 0)),
        "total_assessments_submitted": int(
            student_row.get("total_assessments_submitted", 0)
        ),
    }

    # Cá nhân hóa thêm mục tiêu tuần dựa trên hành vi cụ thể của sinh viên
    custom_weekly_goals: List[str] = list(config["weekly_goals"])
    if fmt_context["quiz_clicks"] == 0:
        custom_weekly_goals.append(
            "Bạn chưa có lượt tương tác Quiz nào: Hãy hoàn thành ít nhất 1 bài Quiz tự luyện tuần này."
        )
    if fmt_context["forum_clicks"] < 10 and cluster_name != "Rời bỏ sớm":
        custom_weekly_goals.append(
            "Tăng cường tương tác trên diễn đàn (hiện tại < 10 clicks) để trao đổi kinh nghiệm làm bài."
        )

    exercises = []
    for ex in config["supplementary_exercises"]:
        exercises.append(
            {
                "title": ex["title"],
                "difficulty": ex["difficulty"],
                "estimated_time": ex["estimated_time"],
                "objective": ex["objective"].format(**fmt_context),
            }
        )

    email_subject = config["email_subject_template"].format(**fmt_context)
    email_body = config["email_body_template"].format(**fmt_context)

    return {
        "cluster_name": cluster_name,
        "cluster_description": config["cluster_description"],
        "intervention_priority": config["intervention_priority"],
        "micro_learning": config["micro_learning"],
        "supplementary_exercises": exercises,
        "weekly_goals": custom_weekly_goals,
        "email_subject": email_subject,
        "email_body": email_body,
    }
