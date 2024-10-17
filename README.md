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
- Django 5.1.2 (or your project’s version)
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

1. Copy the .env.example file to .env

```sh
cp .env.example .env
```

2. Update the .env file with your environment-specific variables, such as database credentials, secret key, etc.

### Running the Project

1.Run migrations to set up the database schema:

```sh
python manage.py migrate
```

Though for this project, the database is not used, the data is stored in a JSON file.

2. Run the development server:

```sh
python manage.py runserver
```

3. Open a browser and go to http://localhost:8000 to view the project.

### License

This project is licensed under the MIT License. See the LICENSE file for more details.

Let me know if you’d like any additional sections or specific instructions tailored to your setup!
