# Copyright 2026 Google LLC
FROM python:3.13-slim

RUN pip install --no-cache-dir uv==0.8.13

WORKDIR /code

COPY ./requirements.txt ./
RUN uv pip install --system -r requirements.txt

COPY ./ ./

EXPOSE 8080

CMD ["sh", "-c", "exec uvicorn fast_api_app:app --host 0.0.0.0 --port ${PORT:-8080}"]
