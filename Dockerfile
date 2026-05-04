FROM python:3.14
WORKDIR /code
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt
COPY . .
CMD ["uvicorn", "core_engine.simple_api:app", "--host", "0.0.0.0", "--port", "7860"]
