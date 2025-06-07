FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Install dependencies for psycopg2 and other build tools if needed
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy the Django project code
COPY dashboard_sdoh /app/dashboard_sdoh

# Collect static files (adjust path to manage.py)
RUN python /app/dashboard_sdoh/manage.py collectstatic --noinput

# Expose port 8000 for Gunicorn
EXPOSE 8000
# Start Gunicorn (adjust the module path to match your project)
#CMD ["gunicorn", "dashboard_sdoh.dashboard_sdoh.wsgi:application", "--bind", "0.0.0.0:8000"]
CMD ["python", "dashboard_sdoh/manage.py", "runserver", "0.0.0.0:8000"]
