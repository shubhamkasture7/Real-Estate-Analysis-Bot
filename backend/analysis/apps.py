from django.apps import AppConfig


class AnalysisConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "analysis"

    def ready(self):
        # Load Excel data when Django starts
        from .data_loader import load_data

        load_data()
