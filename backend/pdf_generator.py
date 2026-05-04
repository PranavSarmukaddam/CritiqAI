import os
from fpdf import FPDF


class AuditPDF(FPDF):
    def header(self):
        self.set_font("helvetica", "B", 16)
        self.cell(0, 10, "CritiqAI Audit Report", border=False, align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(200, 200, 200)
        self.line(10, 20, 200, 20)
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")


def _safe(text):
    """Encode text safely for FPDF (strip non-latin1 chars)."""
    if not isinstance(text, str):
        text = str(text)
    return text.encode("latin-1", "replace").decode("latin-1")


def generate_pdf_report(audit_result: dict, output_path: str):
    pdf = AuditPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Title & Summary
    pdf.set_font("helvetica", "B", 14)
    model_name = audit_result.get("model_name", "Unknown Model")
    pdf.cell(0, 10, _safe(f"Model: {model_name}"), new_x="LMARGIN", new_y="NEXT")

    summary = audit_result.get("summary", {})
    risk_score = summary.get("composite_risk_score", "N/A")
    risk_level = summary.get("risk_level", "N/A")
    task_type = audit_result.get("task_type", "binary_classification")

    pdf.set_font("helvetica", size=12)
    pdf.cell(0, 8, f"Composite Risk Score: {risk_score}/100", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 8, f"Risk Level: {risk_level}", new_x="LMARGIN", new_y="NEXT")

    task_label = {
        "binary_classification": "Binary Classification",
        "multiclass_classification": "Multi-Class Classification",
        "regression": "Regression",
    }.get(task_type, task_type)
    pdf.cell(0, 8, f"Task Type: {task_label}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Performance Metrics
    stages = audit_result.get("stages", [])
    s2 = next((s for s in stages if s.get("stage") == 2), None)
    if s2:
        metrics = s2.get("metrics", {})
        pdf.set_font("helvetica", "B", 12)
        pdf.cell(0, 8, "Performance Metrics:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", size=10)
        for key, val in metrics.items():
            if val is not None:
                label = key.replace("_", " ").title()
                if isinstance(val, float) and val < 2:
                    display = f"{val*100:.1f}%"
                else:
                    display = str(val)
                pdf.cell(0, 6, f"  {label}: {display}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

    # Recommendations
    recs = summary.get("recommendations", [])
    if recs:
        pdf.set_font("helvetica", "B", 12)
        pdf.cell(0, 8, "Key Recommendations:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", size=10)
        for rec in recs:
            pdf.multi_cell(0, 6, _safe(f"- {rec}"), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

    # Stages Details
    pdf.add_page()
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, "Detailed Stage Analysis", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    for stage in stages:
        pdf.set_font("helvetica", "B", 12)
        stage_name = stage.get("name", "Unknown Stage")
        stage_num = stage.get("stage", "?")
        risk_contrib = stage.get("risk_contribution", stage.get("composite_risk_score", 0))

        pdf.cell(0, 8, _safe(f"Stage {stage_num}: {stage_name} (Risk: {risk_contrib})"), new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("helvetica", size=10)
        flags = stage.get("flags", [])
        if not flags:
            pdf.set_text_color(0, 128, 0)
            pdf.cell(0, 6, "Passed with no critical flags.", new_x="LMARGIN", new_y="NEXT")
            pdf.set_text_color(0, 0, 0)
        else:
            pdf.set_text_color(180, 0, 0)
            for flag in flags:
                pdf.multi_cell(0, 6, _safe(f"[!] {flag}"), new_x="LMARGIN", new_y="NEXT")
            pdf.set_text_color(0, 0, 0)

        pdf.ln(4)

    pdf.output(output_path)
