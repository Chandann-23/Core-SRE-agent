FROM python:3.10-slim
WORKDIR /app
COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /app/requirements.txt
COPY . /app
ENV PYTHONPATH=/app
CMD ["uvicorn", "simple_api:app", "--host", "0.0.0.0", "--port", "7860"]
