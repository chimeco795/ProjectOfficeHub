from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class Project(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ''
    objective: str = ''
    methodology: Literal['Agile', 'Waterfall', 'Hybrid'] = 'Hybrid'
    priority: Literal['Baja', 'Media', 'Alta', 'Crítica'] = 'Media'
    status: Literal['Activo', 'En pausa', 'Cerrado'] = 'Activo'
    start_date: date | None = None
    target_date: date | None = None
    go_live: date | None = None
    close_date: date | None = None

    @model_validator(mode='after')
    def check(self):
        self.name = self.name.strip()
        if not self.name:
            raise ValueError('Nombre requerido')
        for end in (self.target_date, self.go_live, self.close_date):
            if self.start_date and end and self.start_date > end:
                raise ValueError('Las fechas objetivo, Go Live y cierre no pueden preceder al inicio')
        return self


class ProjectUpdate(Project):
    version: int = Field(ge=1)
