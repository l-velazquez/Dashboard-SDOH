Cardiovascular and Liver Disease Laboratory Data Visualisation
---

This project is a Django web application that visualises data from the Cardiovascular and Liver Disease Laboratory. It provides a dashboard to view and analyse the data, as well as an admin interface to manage the data.

Table of Contents

- Requirements
- Installation
- Environment Variables
- Running the Project
- Testing
- License

### Requirements

Make sure you have the following installed:

- Python 3.11 (or your preferred version)
- Django 5.1.7 (or your project’s version)
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

### Running the Project

6. Run the development server:

```sh
python manage.py runserver 0.0.0.0:8000
```

7. Open a browser and go to http://localhost:8000 to view the project.

### License

Copyright (c) [2025] Luis Fernando Javier Velázquez Sosa. All Rights Reserved.
