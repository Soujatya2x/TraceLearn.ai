import os

# Backend (Spring Boot) — uses Docker Compose service name in production
JAVA_BASE_URL = os.getenv("JAVA_BASE_URL", "http://localhost:8080")

# Amazon Bedrock
AWS_REGION       = os.getenv("AWS_REGION", "ap-south-1")
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "openai.gpt-oss-120b-1:0")

# S3
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "")