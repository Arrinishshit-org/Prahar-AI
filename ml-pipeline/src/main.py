import os
from dotenv import load_dotenv

load_dotenv()

print('ML Pipeline starting...')
print(f"Service Port: {os.getenv('ML_SERVICE_PORT', '5000')}")

# Placeholder for ML service initialization
# Will be implemented in subsequent tasks
