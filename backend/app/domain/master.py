from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, model_validator

Kind = Literal['Risk','Assumption','Issue','Dependency','Milestone','Activity']

class PersonInput(BaseModel):
    name: str = Field(min_length=1,max_length=200)
    email: str = Field(default='',max_length=254)

    @model_validator(mode='after')
    def validate_person(self):
        self.name=self.name.strip();self.email=self.email.strip()
        if not self.name:raise ValueError('Nombre requerido')
        if self.email and ('@' not in self.email or any(c.isspace() for c in self.email)):
            raise ValueError('Correo inválido')
        return self

class PersonUpdate(PersonInput):
    version: int = Field(ge=1)

class ItemInput(BaseModel):
    kind: Kind
    code: str = Field(min_length=1,max_length=60)
    name: str = Field(min_length=1,max_length=300)
    description: str = Field(default='',max_length=10000)
    status: str = Field(default='Abierto',min_length=1,max_length=80)
    owner_id: str | None = None
    related_id: str | None = None
    start_date: date | None = None
    target_date: date | None = None
    probability: str = Field(default='',max_length=80)
    impact: str = Field(default='',max_length=80)
    response: str = Field(default='',max_length=10000)
    executive_priority: Literal['Baja','Media','Alta','Crítica'] = 'Media'
    include_in_report: bool = True
    progress: float | None = Field(default=None,ge=0,le=100,allow_inf_nan=False)
    archived: bool = False

    @model_validator(mode='after')
    def validate_item(self):
        self.code=self.code.strip();self.name=self.name.strip();self.status=self.status.strip()
        if not self.code or not self.name or not self.status:raise ValueError('Código, nombre y estado requeridos')
        if self.start_date and self.target_date and self.start_date>self.target_date:raise ValueError('Inicio posterior al compromiso')
        return self

class ItemUpdate(ItemInput):
    version: int = Field(ge=1)

class Reconcile(BaseModel):
    record_version: int = Field(ge=1)
    item_id: str | None = None
    new_item: ItemInput | None = None
    @model_validator(mode='after')
    def choose(self):
        if bool(self.item_id)==bool(self.new_item):raise ValueError('Selecciona un elemento existente o crea uno nuevo')
        return self

class Transfer(BaseModel):
    record_version: int = Field(ge=1)
    item_version: int = Field(ge=1)

class ApplyToMaster(Transfer):
    values: ItemInput
