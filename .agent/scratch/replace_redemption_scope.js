const fs = require('fs');
const filePath = 'c:\\Users\\Administrator\\school arcade reward antigravity\\studio\\src\\app\\[schoolId]\\teacher\\TeacherPrinterInner.tsx';

let content = fs.readFileSync(filePath, 'utf8');

// We want to replace the JSX redemption scope block.
// Let's find the exact block using string manipulation.
const oldBlock = `                                             {!secretaryMode && (
                                             <div className={cn('rounded-2xl border p-4 space-y-4', isGraphic ? 'border-white/10 bg-foreground/5' : 'border-border/60 bg-muted/10')}>
                                                 <Label className={cn('text-xs font-semibold uppercase tracking-wide ml-0.5', isGraphic ? 'text-muted-foreground' : 'text-muted-foreground')}>
                                                     Who can redeem these codes
                                                 </Label>
                                                 <RadioGroup
                                                     value={printRedemptionScope}
                                                     onValueChange={(v) => setPrintRedemptionScope(v as CouponRedemptionScope)}
                                                     className="grid gap-3 sm:grid-cols-2"
                                                 >
                                                     <div className={cn('flex items-start gap-2 rounded-xl border p-3', isGraphic ? 'border-white/10 bg-card/40' : 'bg-background/80')}>
                                                         <RadioGroupItem value="creator" id="crs-creator" className="mt-1" />
                                                         <label htmlFor="crs-creator" className="text-sm leading-snug cursor-pointer">
                                                             <span className="font-bold">Only my students</span>
                                                             <span className={cn('block text-xs mt-0.5', isGraphic ? 'text-muted-foreground' : 'text-muted-foreground')}>
                                                                 Students on your roster (by class primary teacher or explicit assignment) can redeem.
                                                             </span>
                                                         </label>
                                                     </div>
                                                     <div className={cn('flex items-start gap-2 rounded-xl border p-3', isGraphic ? 'border-white/10 bg-card/40' : 'bg-background/80')}>
                                                         <RadioGroupItem value="classes" id="crs-classes" className="mt-1" />
                                                         <label htmlFor="crs-classes" className="text-sm leading-snug cursor-pointer">
                                                             <span className="font-bold">Selected classes</span>
                                                             <span className={cn('block text-xs mt-0.5', isGraphic ? 'text-muted-foreground' : 'text-muted-foreground')}>
                                                                 Only students in the classes you pick below (your classes and roster).
                                                             </span>
                                                         </label>
                                                     </div>
                                                 </RadioGroup>
                                                 {printRedemptionScope === 'classes' && (
                                                     <div className="space-y-2">
                                                         <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Classes</p>
                                                         <ScrollArea className={cn('h-40 rounded-xl border p-2', isGraphic ? 'border-white/10 bg-card/30' : 'bg-background')}>
                                                             <div className="space-y-2 pr-3">
                                                                 {classesForTeacherUi.map((cl) => (
                                                                     <label key={cl.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                                                         <Checkbox
                                                                             checked={printScopeClassIds.includes(cl.id)}
                                                                             onCheckedChange={(ch: boolean | 'indeterminate') =>
                                                                                 setPrintScopeClassIds((prev) =>
                                                                                     ch === true ? [...prev, cl.id] : prev.filter((id) => id !== cl.id)
                                                                                 )
                                                                             }
                                                                         />
                                                                         <span>{cl.name}</span>
                                                                     </label>
                                                                 ))}
                                                                 {classesForTeacherUi.length === 0 && (
                                                                     <p className="text-xs text-muted-foreground px-1 py-2">
                                                                         No classes linked to you yet. Claim a class under Attendance or ask an admin to set a primary teacher.
                                                                     </p>
                                                                 )}
                                                             </div>
                                                         </ScrollArea>
                                                     </div>
                                                 )}
                                             </div>
                                             )}`;

const newBlock = `                                             <div className={cn('rounded-2xl border p-4 space-y-4', isGraphic ? 'border-white/10 bg-foreground/5' : 'border-border/60 bg-muted/10')}>
                                                 <Label className={cn('text-xs font-semibold uppercase tracking-wide ml-0.5', isGraphic ? 'text-muted-foreground' : 'text-muted-foreground')}>
                                                     Who can redeem these codes
                                                 </Label>
                                                 <RadioGroup
                                                     value={printRedemptionScope}
                                                     onValueChange={(v) => setPrintRedemptionScope(v as CouponRedemptionScope)}
                                                     className="grid gap-3 sm:grid-cols-2"
                                                 >
                                                     {secretaryMode ? (
                                                         <>
                                                             <div className={cn('flex items-start gap-2 rounded-xl border p-3', isGraphic ? 'border-white/10 bg-card/40' : 'bg-background/80')}>
                                                                 <RadioGroupItem value="school" id="crs-school" className="mt-1" />
                                                                 <label htmlFor="crs-school" className="text-sm leading-snug cursor-pointer">
                                                                     <span className="font-bold">Schoolwide</span>
                                                                     <span className={cn('block text-xs mt-0.5', isGraphic ? 'text-muted-foreground' : 'text-muted-foreground')}>
                                                                         Any student in the school can redeem.
                                                                     </span>
                                                                 </label>
                                                             </div>
                                                             <div className={cn('flex items-start gap-2 rounded-xl border p-3', isGraphic ? 'border-white/10 bg-card/40' : 'bg-background/80')}>
                                                                 <RadioGroupItem value="classes" id="crs-classes" className="mt-1" />
                                                                 <label htmlFor="crs-classes" className="text-sm leading-snug cursor-pointer">
                                                                     <span className="font-bold">Specific classes</span>
                                                                     <span className={cn('block text-xs mt-0.5', isGraphic ? 'text-muted-foreground' : 'text-muted-foreground')}>
                                                                         Only students in the classes you pick below.
                                                                     </span>
                                                                 </label>
                                                             </div>
                                                             <div className={cn('flex items-start gap-2 rounded-xl border p-3', isGraphic ? 'border-white/10 bg-card/40' : 'bg-background/80')}>
                                                                 <RadioGroupItem value="teachers" id="crs-teachers" className="mt-1" />
                                                                 <label htmlFor="crs-teachers" className="text-sm leading-snug cursor-pointer">
                                                                     <span className="font-bold">Specific teachers</span>
                                                                     <span className={cn('block text-xs mt-0.5', isGraphic ? 'text-muted-foreground' : 'text-muted-foreground')}>
                                                                         Only students on the rosters of the selected teachers.
                                                                     </span>
                                                                 </label>
                                                             </div>
                                                         </>
                                                     ) : (
                                                         <>
                                                             <div className={cn('flex items-start gap-2 rounded-xl border p-3', isGraphic ? 'border-white/10 bg-card/40' : 'bg-background/80')}>
                                                                 <RadioGroupItem value="creator" id="crs-creator" className="mt-1" />
                                                                 <label htmlFor="crs-creator" className="text-sm leading-snug cursor-pointer">
                                                                     <span className="font-bold">Only my students</span>
                                                                     <span className={cn('block text-xs mt-0.5', isGraphic ? 'text-muted-foreground' : 'text-muted-foreground')}>
                                                                         Students on your roster (by class primary teacher or explicit assignment) can redeem.
                                                                     </span>
                                                                 </label>
                                                             </div>
                                                             <div className={cn('flex items-start gap-2 rounded-xl border p-3', isGraphic ? 'border-white/10 bg-card/40' : 'bg-background/80')}>
                                                                 <RadioGroupItem value="classes" id="crs-classes" className="mt-1" />
                                                                 <label htmlFor="crs-classes" className="text-sm leading-snug cursor-pointer">
                                                                     <span className="font-bold">Selected classes</span>
                                                                     <span className={cn('block text-xs mt-0.5', isGraphic ? 'text-muted-foreground' : 'text-muted-foreground')}>
                                                                         Only students in the classes you pick below (your classes and roster).
                                                                     </span>
                                                                 </label>
                                                             </div>
                                                         </>
                                                     )}
                                                 </RadioGroup>
                                                 {printRedemptionScope === 'classes' && (
                                                     <div className="space-y-2">
                                                         <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Classes</p>
                                                         <ScrollArea className={cn('h-40 rounded-xl border p-2', isGraphic ? 'border-white/10 bg-card/30' : 'bg-background')}>
                                                             <div className="space-y-2 pr-3">
                                                                 {classesForTeacherUi.map((cl) => (
                                                                     <label key={cl.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                                                         <Checkbox
                                                                             checked={printScopeClassIds.includes(cl.id)}
                                                                             onCheckedChange={(ch: boolean | 'indeterminate') =>
                                                                                 setPrintScopeClassIds((prev) =>
                                                                                     ch === true ? [...prev, cl.id] : prev.filter((id) => id !== cl.id)
                                                                                 )
                                                                             }
                                                                         />
                                                                         <span>{cl.name}</span>
                                                                     </label>
                                                                 ))}
                                                                 {classesForTeacherUi.length === 0 && (
                                                                     <p className="text-xs text-muted-foreground px-1 py-2">
                                                                         No classes linked to you yet. Claim a class under Attendance or ask an admin to set a primary teacher.
                                                                     </p>
                                                                 )}
                                                             </div>
                                                         </ScrollArea>
                                                     </div>
                                                 )}
                                                 {printRedemptionScope === 'teachers' && (
                                                     <div className="space-y-2">
                                                         <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Teachers</p>
                                                         <ScrollArea className={cn('h-40 rounded-xl border p-2', isGraphic ? 'border-white/10 bg-card/30' : 'bg-background')}>
                                                             <div className="space-y-2 pr-3">
                                                                 {(teachers || []).map((t) => (
                                                                     <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                                                         <Checkbox
                                                                             checked={printScopeTeacherIds.includes(t.id)}
                                                                             onCheckedChange={(ch: boolean | 'indeterminate') =>
                                                                                 setPrintScopeTeacherIds((prev) =>
                                                                                     ch === true ? [...prev, t.id] : prev.filter((id) => id !== t.id)
                                                                                 )
                                                                             }
                                                                         />
                                                                         <span>{t.name}</span>
                                                                     </label>
                                                                 ))}
                                                                 {(teachers || []).length === 0 && (
                                                                     <p className="text-xs text-muted-foreground px-1 py-2">
                                                                         No teachers available.
                                                                     </p>
                                                                 )}
                                                             </div>
                                                         </ScrollArea>
                                                     </div>
                                                 )}
                                             </div>`;

// Check if oldBlock exists using either line ending
const hasLf = content.includes(oldBlock.replace(/\r\n/g, '\n'));
const hasCrlf = content.includes(oldBlock.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'));

if (hasCrlf) {
    console.log('Found old block with CRLF, replacing...');
    content = content.replace(oldBlock.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'), newBlock.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'));
    fs.writeFileSync(filePath, content, 'utf8');
} else if (hasLf) {
    console.log('Found old block with LF, replacing...');
    content = content.replace(oldBlock.replace(/\r\n/g, '\n'), newBlock.replace(/\r\n/g, '\n'));
    fs.writeFileSync(filePath, content, 'utf8');
} else {
    console.error('ERROR: oldBlock not found in file!');
}
