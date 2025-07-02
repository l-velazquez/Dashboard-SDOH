# Dashboard-SDOH

![Django](https://img.shields.io/badge/Django-5.1.10-blue.svg)
![Python](https://img.shields.io/badge/Python-3.13-blue.svg)
![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)
![Issues](https://img.shields.io/github/issues/l-velazquez/Dashboard-SDOH)
![Last Commit](https://img.shields.io/github/last-commit/l-velazquez/Dashboard-SDOH)

---
![image of a map dashboard](<images/Screenshot 2025-07-02 at 1.31.54 PM.png>)

Live Page: [https://sdoh-rcmi.rcm.upr.edu](https://sdoh-rcmi.rcm.upr.edu)

This project is a Django web application that visualises data from the Cardiovascular , Hepatic, Renal and Vitamin D Risk from Abartys Health Laboratory Data. It provides a dashboard to view and analyse the data.

Table of Contents

- Requirements
- Installation
- Environment Variables
- Running the Project
- Docker Setup
- Testing
- License

### Requirements

Make sure you have the following installed:

- Python 3.13 (as used in the Dockerfile)
- Django 5.1.10 (or your project’s version)
- Virtualenv (optional but recommended)
- Other dependencies are listed in requirements.txt

### Installation

1. Clone the repository

```sh
git clone https://github.com/l-velazquez/Dashboard-SDOH.git
cd Dashboard-SDOH
```

2. Set up a virtual environment

```sh
python3 -m venv env
source env/bin/activate  # On Windows use `env\Scripts\activate`
```

3. Install dependencies

```sh
pip install --upgrade pip && pip install -r requirements.txt
```

### Environment Variables

4. Copy the .env.example file to .env

```sh
cp .env.example .env
```

5. Update the .env file with your environment-specific variables, such as database credentials, secret key, etc.

### Running the Project (Local Development)

6. Run Django migrations (if applicable):

   ```sh
   python manage.py migrate
   ```

7. Run the development server:

```sh
python manage.py runserver 0.0.0.0:8000
```

8. Open a browser and go to `http://localhost:8000` to view the project.

--

### Docker Setup

This project includes a `Dockerfile` for containerization.

#### 1. Prerequisites

Ensure you have Docker installed and running on your system (e.g., Docker Desktop, OrbStack).

#### 2. Build the Docker Image

Navigate to the root directory of the project where the `Dockerfile` is located.
Then, build the Docker image:

```sh
docker build -t sdoh-dashboard .
```

This command builds the image and tags it as `sdoh-dashboard`.

#### 3. Run the Docker Container

Once the image is built, you can run a container from it:

```sh
docker run -p 8000:8000 sdoh-dashboard
```

This command maps port `8000` on your host machine to port `8000` inside the container, making the Django application accessible.

#### 4. Access the Application

Open a web browser and navigate to `http://localhost:8000`.

---

### License

Copyright (c) [2025] Luis Fernando Javier Velázquez Sosa. All Rights Reserved.
