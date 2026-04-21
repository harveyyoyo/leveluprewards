import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Trash2, Wand2, Users, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Class, Student } from '@/lib/types';
import { useSettings } from './providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { useAuthFetch } from '@/lib/authFetch';
import { useAppContext } from './AppProvider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface AiStudentImporterProps {
    classes: Class[];
    onSaveAll: (students: Partial<Student>[]) => Promise<void>;
}

export function AiStudentImporter({ classes, onSaveAll }: AiStudentImporterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [rawText, setRawText] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [parsedStudents, setParsedStudents] = useState<Partial<Student>[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const { settings } = useSettings();
    const authFetch = useAuthFetch();
    const { schoolId } = useAppContext();
    const isGraphic = settings.graphicMode === 'graphics';

    const handleParse = async () => {
        if (!rawText.trim()) return;
        setIsParsing(true);
        try {
            const classNames = classes.map(c => c.name);
            const res = await authFetch('/api/parse-students', {
                method: 'POST',
                body: JSON.stringify({ 
                    prompt: rawText, 
                    model: localStorage.getItem('arcade_ai_model') || 'gemini-2.5-flash',
                    classNames,
                    schoolId,
                })
            });
            if (!res.ok) throw new Error('Failed to parse students');
            const data = await res.json();
            
            // Map the parsed JSON to Partial<Student>
            const mapped = data.map((s: any) => {
                let classId = '';
                // Try to find a matching class by name
                if (s.className) {
                    const matchedClass = classes.find(c => c.name.toLowerCase() === s.className.toLowerCase());
                    if (matchedClass) {
                        classId = matchedClass.id;
                    }
                }

                return {
                    firstName: s.firstName || 'Unknown',
                    lastName: s.lastName || 'Unknown',
                    classId: classId,
                    nfcId: '', // Blank by default so admin can scan one in if they want
                    points: 0,
                    lifetimePoints: 0,
                };
            });
            
            setParsedStudents(mapped);
            if (mapped.length === 0) {
                 toast({ title: 'No students found', description: 'Could not extract any students from the provided text.' });
            } else {
                 toast({ title: 'Roster Parsed', description: `Successfully extracted ${mapped.length} students. Please review before saving.` });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error processing roster', description: error.message });
        } finally {
            setIsParsing(false);
        }
    };

    const updateParsedStudent = (index: number, updates: Partial<Student>) => {
        const newStudents = [...parsedStudents];
        newStudents[index] = { ...newStudents[index], ...updates };
        setParsedStudents(newStudents);
    };

    const removeParsedStudent = (index: number) => {
        setParsedStudents(parsedStudents.filter((_, i) => i !== index));
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            await onSaveAll(parsedStudents);
            setIsOpen(false);
            setRawText('');
            setParsedStudents([]);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="font-bold uppercase tracking-widest gap-2" variant={isGraphic ? 'secondary' : 'outline'}>
                    <Wand2 className="w-4 h-4" /> Import w/ AI
                </Button>
            </DialogTrigger>
            <DialogContent className={cn("sm:max-w-[800px] h-[85vh] flex flex-col p-0 overflow-hidden", isGraphic ? 'bg-card/95 backdrop-blur-2xl border-primary/20' : 'bg-white')}>
                <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                    <DialogTitle className="text-2xl font-black flex items-center gap-2">
                        <Wand2 className="w-6 h-6 text-primary" /> AI Student Importer
                    </DialogTitle>
                    <DialogDescription>
                        Paste your raw student roster (e.g., from an email or document). The AI will extract the names and attempt to match them to existing classes.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x overflow-hidden border-t">
                    {/* Left: Input Sidebar */}
                    <div className="md:w-1/3 flex flex-col bg-slate-50/50 dark:bg-black/20 p-4 shrink-0">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Raw Text</Label>
                        <textarea 
                            className="flex-grow w-full rounded-xl border border-input bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="e.g. John Doe (Math), Jane Smith - Science 101..."
                            value={rawText}
                            onChange={e => setRawText(e.target.value)}
                        />
                        <Button 
                            className="w-full mt-4 font-bold" 
                            onClick={handleParse} 
                            disabled={isParsing || !rawText.trim()}
                        >
                            {isParsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                            Process Text
                        </Button>
                    </div>

                    {/* Right: Parsed Results */}
                    <div className="md:w-2/3 flex flex-col shrink-0 min-h-0">
                         <div className="px-4 py-3 border-b bg-muted/30 flex justify-between items-center shrink-0">
                            <Label className="font-black text-xs uppercase tracking-widest">
                                Parsed Students ({parsedStudents.length})
                            </Label>
                            {parsedStudents.length > 0 && (
                                <Button size="sm" onClick={handleSaveAll} disabled={isSaving} className="gap-2 font-bold h-8">
                                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    Save All to Database
                                </Button>
                            )}
                        </div>
                        <ScrollArea className="flex-grow p-4">
                            {parsedStudents.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-40 py-20">
                                    <Users className="w-12 h-12 mb-4" />
                                    <p className="text-sm font-bold text-center px-8">Generated students will appear here for review and class assignment.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {parsedStudents.map((s, i) => (
                                        <Card key={i} className="shadow-sm">
                                            <CardContent className="p-4 flex flex-col gap-3 relative">
                                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive z-10" onClick={() => removeParsedStudent(i)}>
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                                <div className="grid grid-cols-2 gap-3 pr-6">
                                                     <div className="space-y-1">
                                                        <Label className="text-[10px] font-bold uppercase tracking-widest">First Name</Label>
                                                        <Input className="h-8 font-bold" value={s.firstName || ''} onChange={e => updateParsedStudent(i, { firstName: e.target.value })} />
                                                     </div>
                                                     <div className="space-y-1">
                                                        <Label className="text-[10px] font-bold uppercase tracking-widest">Last Name</Label>
                                                        <Input className="h-8 font-bold" value={s.lastName || ''} onChange={e => updateParsedStudent(i, { lastName: e.target.value })} />
                                                     </div>
                                                     
                                                     <div className="space-y-1 col-span-2 mt-1 pt-3 border-t">
                                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
                                                            Assign Class
                                                        </Label>
                                                        <Select value={s.classId || 'unassigned'} onValueChange={v => updateParsedStudent(i, { classId: v === 'unassigned' ? '' : v })}>
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue placeholder="No Class" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="unassigned">No Class</SelectItem>
                                                                {classes.map(c => (
                                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                     </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
