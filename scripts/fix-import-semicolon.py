import pathlib

for path in pathlib.Path("src/app/[schoolId]/admin/sections").glob("*.tsx"):
    text = path.read_text(encoding="utf-8")
    fixed = text.replace(
        "} from '@/components/staff/StaffPortalSection';\n;\n",
        "} from '@/components/staff/StaffPortalSection';\n",
    )
    if fixed != text:
        path.write_text(fixed, encoding="utf-8")
        print(path.name)
