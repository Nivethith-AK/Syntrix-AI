FROM python:3.12-slim
RUN pip install --no-cache-dir mlflow==2.20.1
WORKDIR /mlflow
EXPOSE 5000
CMD ["mlflow", "server", "--host", "0.0.0.0", "--port", "5000"]
