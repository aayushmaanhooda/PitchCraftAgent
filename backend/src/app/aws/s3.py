from functools import lru_cache
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from core.config import get_settings


@lru_cache()
def get_s3_client():
    settings = get_settings()
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )


def upload_bytes(
    data: bytes,
    s3_key: str,
    content_type: Optional[str] = None,
) -> str:
    client = get_s3_client()
    bucket = get_settings().AWS_S3_BUCKET
    extra = {"ContentType": content_type} if content_type else {}
    client.put_object(Bucket=bucket, Key=s3_key, Body=data, **extra)
    return s3_key


def download_bytes(s3_key: str) -> bytes:
    client = get_s3_client()
    bucket = get_settings().AWS_S3_BUCKET
    response = client.get_object(Bucket=bucket, Key=s3_key)
    return response["Body"].read()


def delete_object(s3_key: str) -> None:
    client = get_s3_client()
    bucket = get_settings().AWS_S3_BUCKET
    client.delete_object(Bucket=bucket, Key=s3_key)


def generate_presigned_url(s3_key: str, expires_in: int = 3600) -> str:
    client = get_s3_client()
    bucket = get_settings().AWS_S3_BUCKET
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": s3_key},
        ExpiresIn=expires_in,
    )


def object_exists(s3_key: str) -> bool:
    client = get_s3_client()
    bucket = get_settings().AWS_S3_BUCKET
    try:
        client.head_object(Bucket=bucket, Key=s3_key)
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] in ("404", "NoSuchKey"):
            return False
        raise
