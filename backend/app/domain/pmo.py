from datetime import date as Date, time as Time
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, Field, model_validator

class Versioned(BaseModel):
    version:int=Field(default=1,ge=1)
    archived:bool=False

class Period(Versioned):
    kind:Literal['Iteration','Release']='Iteration'
    name:str=Field(min_length=1,max_length=200)
    start_date:Date|None=None
    end_date:Date|None=None
    status:str=Field(default='Planned',min_length=1,max_length=80)
    description:str=Field(default='',max_length=10000)
    @model_validator(mode='after')
    def dates(self):
        if not self.name.strip():raise ValueError('Nombre requerido')
        if self.start_date and self.end_date and self.start_date>self.end_date:raise ValueError('Inicio posterior al fin')
        return self

class Team(Versioned):
    name:str=Field(min_length=1,max_length=200)
    lead_id:str|None=None

class Membership(Versioned):
    team_id:str|None=None
    person_id:str
    role:str=Field(min_length=1,max_length=100)
    allocation:float=Field(ge=0,le=100,allow_inf_nan=False)
    valid_from:Date|None=None
    valid_to:Date|None=None
    @model_validator(mode='after')
    def dates(self):
        if self.valid_from and self.valid_to and self.valid_from>self.valid_to:raise ValueError('Vigencia inválida')
        return self

Money=Decimal
class Budget(BaseModel):
    version:int=Field(default=0,ge=0)
    currency:Literal['MXN','USD','EUR']='MXN'
    approved:Money=Field(ge=0,max_digits=14,decimal_places=2)
    contingency:Money=Field(default=Decimal(0),ge=0,max_digits=14,decimal_places=2)
    notes:str=Field(default='',max_length=10000)

class Entry(Versioned):
    concept:str=Field(min_length=1,max_length=300)
    category:str=Field(min_length=1,max_length=100)
    kind:Literal['Planned','Committed','Actual','Forecast']='Planned'
    amount:Money=Field(ge=0,max_digits=14,decimal_places=2)
    currency:Literal['MXN','USD','EUR']='MXN'
    date:Date|None=None
    related_id:str|None=None
    vendor:str=Field(default='',max_length=300)
    notes:str=Field(default='',max_length=10000)

class Event(Versioned):
    title:str=Field(min_length=1,max_length=300)
    date:Date
    time:Time
    kind:str=Field(default='Reunión',min_length=1,max_length=100)
    owner_id:str|None=None
    description:str=Field(default='',max_length=10000)
    guests:list[str]=Field(default_factory=list,max_length=200)
    duration_minutes:int|None=Field(default=None,ge=1,le=10080)
    related_id:str|None=None
    status:Literal['Programado','Confirmado','Completado','Cancelado']='Programado'
    notes:str=Field(default='',max_length=10000)
    document_ids:list[str]=Field(default_factory=list,max_length=100)

class DocumentUpdate(Versioned):
    author_id:str|None=None
    related_id:str|None=None
    notes:str=Field(default='',max_length=10000)
