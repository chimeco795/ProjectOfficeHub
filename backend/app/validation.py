"""Validation for corrected and manual values; originals remain untouched."""
from datetime import date
import math

PERCENTAGES = {'planned', 'actual', 'percentage', 'confidence_percent'}
DATES = {'date', 'start_date', 'end_date', 'actual_date', 'required_date', 'forecast_date'}

def validate_values(values):
    for key, value in values.items():
        if isinstance(value, (dict, list)):
            raise ValueError(f'{key}: el valor debe ser texto, número, booleano o vacío.')
        if value is None or value == '':
            continue
        if key in PERCENTAGES:
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 100:
                raise ValueError(f'{key}: indica un porcentaje entre 0 y 100.')
        elif isinstance(value, float) and not math.isfinite(value):
            raise ValueError(f'{key}: número no válido.')
        if key in DATES:
            try:
                date.fromisoformat(str(value)[:10])
            except ValueError:
                raise ValueError(f'{key}: usa una fecha válida (AAAA-MM-DD).')
        if key == 'executive_priority' and not isinstance(value, bool):
            raise ValueError('executive_priority: usa verdadero o falso.')
    start, end = values.get('start_date'), values.get('end_date')
    if start and end and str(start)[:10] > str(end)[:10]:
        raise ValueError('La fecha de inicio debe ser anterior o igual a la fecha de fin.')

def generated(values):
    if all(isinstance(values.get(k), (int, float)) and not isinstance(values[k], bool) for k in ['planned','actual']):
        return {'variation': round(values['actual'] - values['planned'], 6)}
    return {}
