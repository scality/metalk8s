ARG PYTHON_VERSION=3.10-slim
FROM python:${PYTHON_VERSION}

ARG POETRY_VERSION=1.7.1
RUN pip install poetry==${POETRY_VERSION}

WORKDIR /project/
COPY poetry.lock pyproject.toml ./

ARG INSTALL_EXTRAS="-E cli"
RUN poetry config virtualenvs.create false && \
    poetry install --no-interaction --no-ansi ${INSTALL_EXTRAS}
