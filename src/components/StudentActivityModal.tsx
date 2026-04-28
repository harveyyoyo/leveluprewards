'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Student, HistoryItem } from '@/lib/types';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { getStudentNickname } from '@/lib/utils';


interface StudentActivityModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  student: Student | null;
}

function ActivityList({ schoolId, studentId }: { schoolId: string; studentId: string }) {
  const firestore = useFirestore();
  const activitiesQuery = useMemoFirebase(() => (
    query(
      collection(firestore, `schools/${schoolId}/students/${studentId}/activities`),
      orderBy('date', 'desc'),
      limit(100)
    )
  ), [firestore, schoolId, studentId]);
  const { data: history, isLoading } = useCollection<HistoryItem>(activitiesQuery);

  if (isLoading) {
    return <p className="text-center text-muted-foreground italic py-4">Loading history...</p>;
  }

  return (
    <ScrollArea className="h-72 w-full pr-4">
      <ul className="space-y-4">
        {history && history.length > 0 ? (
          history.map((item, index) => (
            <li
              key={index}
              className="flex justify-between items-center text-sm p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border"
            >
              <div>
                <p className="font-medium">{item.desc}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(item.date), 'MMM d, yyyy, h:mm a')}
                </p>
              </div>
              <Badge
                variant={item.amount >= 0 ? 'default' : 'destructive'}
                className={`font-bold ${item.amount >= 0 ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}
              >
                {item.amount > 0 ? `+${item.amount}` : item.amount}
              </Badge>
            </li>
          ))
        ) : (
          <p className="text-center text-muted-foreground italic py-4">
            No transaction history yet.
          </p>
        )}
      </ul>
    </ScrollArea>
  );
}

export function StudentActivityModal({ isOpen, setIsOpen, student }: StudentActivityModalProps) {
  const { schoolId } = useAppContext();

  if (!student || !schoolId) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Activity for {getStudentNickname(student)} {student.lastName}
          </DialogTitle>
          <DialogDescription>
            Current Balance: <span className="font-bold text-primary">{(student.points || 0).toLocaleString()} points</span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <h4 className="font-semibold mb-2">Full History</h4>
          <ActivityList schoolId={schoolId} studentId={student.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
