FROM public.ecr.aws/docker/library/python:3.11

WORKDIR /app

# Install dependencies for psycopg2 and other build tools if needed
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy Django project code
COPY dashboard_sdoh /app/dashboard_sdoh

# Collect static files
RUN python /app/dashboard_sdoh/manage.py collectstatic --noinput

# Expose port 8000
EXPOSE 8000

CMD ["python", "dashboard_sdoh/manage.py", "runserver", "0.0.0.0:8000"]
