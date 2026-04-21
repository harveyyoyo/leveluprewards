
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSettings } from './providers/SettingsProvider';
import { ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const steps = [
  {
    title: 'Welcome to levelUp EDU!',
    description: 'This quick tour will walk you through the essential features of the app. Click "Next" to begin.',
    target: '/portal',
  },
  {
    title: 'Step 1: Go to Admin',
    description: 'From the portal page, click on "Admin Portal" to start managing your school\'s data. The wizard will meet you there!',
    target: '/portal',
    hideNext: true,
  },
  {
    title: 'Step 2: Add a Class',
    description: 'You\'re in the Admin Dashboard! Find the "Classes" section and click "Add Class" to create your first class group. Then click "Next".',
    target: '/admin',
  },
  {
    title: 'Step 3: Add a Teacher',
    description: 'Great! Now, let\'s add a teacher. Find the "Teachers" section and click "Add Teacher". Then click "Next".',
    target: '/admin',
  },
  {
    title: 'Step 4: Add a Student',
    description: "Add a student. You can assign them to any classes and multiple teachers. Make a note of the Student ID—you'll need it for the next step. Click 'Next' when you're done.",
    target: '/admin',
  },
  {
    title: 'Step 5: Go to Portal',
    description: 'Fantastic! Now, click the "Home" icon in the header to go back to the main portal page.',
    target: '/admin',
    hideNext: true,
  },
  {
    title: 'Step 6: Teacher Portal',
    description: `Now that you have a class, teacher, and student, let's print some reward coupons. From the portal page, click on "Teacher Portal" to continue.`,
    target: '/portal',
    hideNext: true,
  },
  {
    title: 'Step 7: Print Coupons',
    description: `We're in the Teacher Portal as an Admin (you could also log in as a specific teacher). Let's generate some coupons. Select a category and point value, then click "Generate Sheet". A print preview will open. Make a note of one of the coupon codes for the next step, then click Next.`,
    target: '/teacher',
  },
  {
    title: 'Step 8: Student Kiosk',
    description: `Great! Now, navigate back to the portal (using the home icon in the header) and click on "Student Kiosk" to sign in as the student you created.`,
    target: '/teacher',
    hideNext: true,
  },
  {
    title: 'Step 9: Redeem a Coupon',
    description: "You're at the student kiosk. Type in the Student ID you created and click 'Identify Student'. Then, try redeeming the coupon code you noted down.",
    target: '/student',
  },
  {
    title: 'Step 10: Go to Prize Shop',
    description: 'The points were added! Let\'s go spend them. Log out of the student kiosk and go to the "Prize Shop" from the main portal. Sign in as the same student.',
    target: '/student',
    hideNext: true,
  },
  {
    title: 'Step 11: Fulfill the Prize',
    description: "After the student 'buys' a prize, the teacher needs to actually hand it out. Log out and return to the 'Teacher Portal'. Find the redeemed prize in the 'Prize Redemptions' list, give the prize to the student in real life, and then check the box to mark it as delivered so it disappears from the pending list.",
    target: '/prize',
  },
  {
    title: 'Step 12: Hall of Fame',
    description: 'Great! The final step is to check out the school leaderboards. Navigate back to the main portal and click on the "Hall of Fame".',
    target: '/teacher',
    hideNext: true,
  },
  {
    title: "Step 13: You're a Pro!",
    description: "You've completed the tour of the main features! Feel free to explore the Admin dashboard for more settings. You can turn this wizard off in the settings menu at any time.",
    target: '/halloffame',
  },
];


export function IntroWizard() {
  const { settings, updateSettings } = useSettings();
  const [stepIndex, setStepIndex] = useState(0);

  const isWizardEnabled = settings.showIntroWizard === true;

  // Remember progress so restarting the wizard continues where you left off.
  useEffect(() => {
    if (!isWizardEnabled) return;
    const key = 'arcade_intro_wizard_step';
    const stored = window.localStorage.getItem(key);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed < steps.length) {
        setStepIndex(parsed);
      }
    }
  }, [isWizardEnabled]);

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      const next = stepIndex + 1;
      setStepIndex(next);
      window.localStorage.setItem('arcade_intro_wizard_step', String(next));
    } else {
      handleTurnOff();
    }
  };

  const handleBack = () => {
    setStepIndex((prev) => {
      const next = prev > 0 ? prev - 1 : 0;
      window.localStorage.setItem('arcade_intro_wizard_step', String(next));
      return next;
    });
  };

  const handleTurnOff = () => {
    updateSettings({ showIntroWizard: false });
    window.localStorage.removeItem('arcade_intro_wizard_step');
  };
  
  const currentStep = steps[stepIndex];

  if (!isWizardEnabled || !currentStep) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        key={stepIndex}
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="no-print fixed bottom-32 right-6 w-full max-w-sm z-[200]"
      >
        <Card className="shadow-2xl border-2 border-primary/20 bg-background/80 backdrop-blur-xl">
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>{currentStep.title}</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={handleTurnOff}>
                    <X className="w-4 h-4"/>
                </Button>
            </div>
            <CardDescription>{currentStep.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center w-full">
              <div className="text-[11px] text-muted-foreground">
                Step {stepIndex + 1} of {steps.length}
              </div>
              <div className="flex gap-2">
                {stepIndex > 0 && (
                  <Button variant="outline" onClick={handleBack} className="rounded-full">
                    Back
                  </Button>
                )}
                <Button onClick={handleNext} className="rounded-full shadow-lg">
                  {stepIndex < steps.length - 1 ? 'Next' : 'Finish'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
