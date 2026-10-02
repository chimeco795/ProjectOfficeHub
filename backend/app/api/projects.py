from fastapi import APIRouter

from ..domain.projects import Project, ProjectUpdate
from ..repositories import projects

router = APIRouter(prefix='/api/projects', tags=['Projects'])


@router.get('')
def list_projects():
    return projects.list_projects()


@router.post('', status_code=201)
def create_project(value: Project):
    return projects.create_project(value)


@router.get('/{project_id}')
def get_project(project_id: str):
    return projects.get_project(project_id)


@router.put('/{project_id}')
def update_project(project_id: str, value: ProjectUpdate):
    return projects.update_project(project_id, value)
