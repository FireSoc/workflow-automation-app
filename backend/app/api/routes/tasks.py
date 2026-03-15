from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.models.onboarding_project import OnboardingProject
from app.models.task import Task
from app.schemas.task import TaskCompleteResponse, TaskRead
from app.services.task_service import complete_task

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("/{task_id}/complete", response_model=TaskCompleteResponse)
def mark_task_complete(task_id: int, db: Session = Depends(get_db)) -> TaskCompleteResponse:
    task = (
        db.query(Task)
        .options(selectinload(Task.project).selectinload(OnboardingProject.tasks))
        .filter(Task.id == task_id)
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found."
        )

    from app.models.enums import TaskStatus

    if task.status == TaskStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Task is already completed.",
        )

    project = (
        db.query(OnboardingProject)
        .options(
            selectinload(OnboardingProject.tasks),
            selectinload(OnboardingProject.customer),
        )
        .filter(OnboardingProject.id == task.project_id)
        .first()
    )

    task, advanced, new_stage, project_completed = complete_task(db, task, project)

    if project_completed:
        msg = "Task completed. All stages finished — project marked as completed."
    elif advanced:
        msg = f"Task completed. Project advanced to stage '{new_stage.value}'."
    else:
        msg = "Task completed. Stage gate not yet satisfied; project remains in current stage."

    return TaskCompleteResponse(
        task=TaskRead.model_validate(task),
        stage_advanced=advanced,
        new_stage=new_stage,
        project_completed=project_completed,
        message=msg,
    )
