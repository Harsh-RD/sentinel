import os
SECRET_KEY = os.environ.get("SECRET_KEY", "supersecretkey_change_in_prod")
ALGORITHM = "HS256"
