import re
import pathlib

root = pathlib.Path("src/app/[schoolId]/admin/sections")
skip = {"AdminStudentsTab.tsx", "AdminPrizesTab.tsx"}

import_line = """import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
  StaffPortalSectionCardHeader,
  StaffPortalSectionCardTitle,
} from '@/components/staff/StaffPortalSection';
"""

for path in sorted(root.glob("*.tsx")):
    if path.name in skip:
        continue
    text = path.read_text(encoding="utf-8")
    if "border-t-4 border-primary" not in text:
        continue
    if "StaffPortalSectionCard" in text:
        continue

    orig = text
    marker = "from '@/components/ui/card'"
    if marker not in text:
        continue
    text = text.replace(marker, marker + "\n" + import_line, 1)

    def card_repl(match: re.Match[str]) -> str:
        cls = match.group(1)
        cls = re.sub(r"\s*border-t-4\s+border-primary\s*", " ", cls)
        cls = re.sub(r"\s*shadow-md\s*", " ", cls)
        cls = re.sub(r"\s+", " ", cls).strip()
        return f'<StaffPortalSectionCard className="{cls}"'

    text = re.sub(r'<Card className="([^"]*)"', card_repl, text, count=1)
    if "<StaffPortalSectionCard" not in text:
        continue

    text = text.replace("<CardHeader", "<StaffPortalSectionCardHeader")
    text = text.replace("</CardHeader>", "</StaffPortalSectionCardHeader>")
    text = text.replace("<CardTitle", "<StaffPortalSectionCardTitle")
    text = text.replace("</CardTitle>", "</StaffPortalSectionCardTitle>")

    # Close the main section card only (first Card open was replaced)
    idx = text.find("</StaffPortalSectionCardContent>")
    if idx == -1:
        text = text.replace("<CardContent", "<StaffPortalSectionCardContent", 1)
        text = text.replace("</CardContent>", "</StaffPortalSectionCardContent>", 1)
    else:
        text = text.replace("<CardContent", "<StaffPortalSectionCardContent", 1)
        text = text.replace("</CardContent>", "</StaffPortalSectionCardContent>", 1)

    # Replace first closing </Card> after section content
    text = text.replace("</Card>", "</StaffPortalSectionCard>", 1)

    if text != orig:
        path.write_text(text, encoding="utf-8")
        print("updated", path.name)
