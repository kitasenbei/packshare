import os
import json
import dotenv

dotenv.load_dotenv()

def _load_aws_secrets():
    """Load secrets from AWS Secrets Manager if running in Lambda"""
    if os.getenv("AWS_SECRETS_MANAGER") != "true":
        return {}

    try:
        import boto3
        client = boto3.client('secretsmanager')
        secrets = {}

        # Load osu! OAuth credentials
        osu_oauth_arn = os.getenv("OSU_OAUTH_ARN")
        if osu_oauth_arn:
            response = client.get_secret_value(SecretId=osu_oauth_arn)
            osu_creds = json.loads(response['SecretString'])
            secrets['OSU_CLIENT_ID'] = osu_creds.get('client_id', '')
            secrets['OSU_CLIENT_SECRET'] = osu_creds.get('client_secret', '')

        # Load JWT secret
        jwt_secret_arn = os.getenv("JWT_SECRET_ARN")
        if jwt_secret_arn:
            response = client.get_secret_value(SecretId=jwt_secret_arn)
            secrets['SECRET_KEY'] = response['SecretString']

        return secrets
    except Exception as e:
        print(f"Warning: Failed to load AWS secrets: {e}")
        return {}

_aws_secrets = _load_aws_secrets()

class Config:
    # osu! OAuth
    OSU_CLIENT_ID = _aws_secrets.get("OSU_CLIENT_ID") or os.getenv("OSU_CLIENT_ID", "")
    OSU_CLIENT_SECRET = _aws_secrets.get("OSU_CLIENT_SECRET") or os.getenv("OSU_CLIENT_SECRET", "")
    OSU_REDIRECT_URI = os.getenv("OSU_REDIRECT_URI", "http://localhost:8001/auth/callback")

    # JWT
    SECRET_KEY = _aws_secrets.get("SECRET_KEY") or os.getenv("SECRET_KEY", "change-me-in-production")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_DAYS = int(os.getenv("JWT_EXPIRATION_DAYS", "7"))

    # CORS - comma-separated list of allowed origins
    ALLOWED_ORIGINS = [
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    ]

    # Default redirect after auth (if no referer)
    DEFAULT_REDIRECT = os.getenv("DEFAULT_REDIRECT", "http://localhost:5173")

    # Debug
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"
