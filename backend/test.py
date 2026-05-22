from app.repositories.hospital_repository import HospitalRepository

repo = HospitalRepository()

print(repo.get_all())