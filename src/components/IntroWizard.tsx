
'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSettings } from './providers/SettingsProvider';
import { ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { springCinematic } from '@/lib/animation';
import { APP_NAME } from '@/lib/appBranding';

const steps = [
  {
    title: `Welcome to ${APP_NAME}!`,
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
    title: 'Step 10: Go to the Rewards Shop',
    description: 'The points were added! Let\'s go spend them. On the student kiosk, scroll to Eligible Rewards and tap "See all rewards" to open the rewards shop (stay signed in as the same student).',
    target: '/student',
    hideNext: true,
  },
  {
    title: 'Step 11: Redeem a Reward',
    description: "You're in the Rewards Shop! Select a reward you can afford and click 'Buy'. Once redeemed, you'll see a success message. Then, return to the 'Teacher Portal' (using the home icon then 'Teacher Portal') to finalize the delivery.",
    target: '/prize',
    hideNext: true,
  },
  {
    title: 'Step 12: Fulfill the Reward',
    description: "Back in the Teacher Portal, find your redemption in the 'Reward Redemptions' list. In a real classroom, you'd hand over the reward now. Click the checkbox to mark it as delivered. Finally, let's see the leaderboards—head to the 'Hall of Fame' from the portal.",
    target: '/teacher',
    hideNext: true,
  },
  {
    title: "Step 13: Hall of Fame",
    description: "You've made it! This is the school leaderboard. You can see top students by points or period. You've completed the tour and are ready to level up your school!",
    target: '/hall-of-fame',
  },
];


export function IntroWizard() {
  const { settings, updateSettings } = useSettings();
  const pathname = usePathname();
  const [stepIndex, setStepIndex] = useState(0);

  const isWizardEnabled = settings.showIntroWizard === true;
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/developer' ||
    pathname.startsWith('/s/');

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

  // Auto-advance only on navigation steps (hideNext). Otherwise several admin steps
  // sharing `/admin` would skip ahead before the user reads them.
  useEffect(() => {
    if (!isWizardEnabled || !pathname) return;

    const current = steps[stepIndex];
    if (!current?.hideNext) return;

    const nextStep = steps[stepIndex + 1];
    if (nextStep && (pathname === nextStep.target || pathname.endsWith(nextStep.target))) {
      setStepIndex(stepIndex + 1);
      window.localStorage.setItem('arcade_intro_wizard_step', String(stepIndex + 1));
    }
  }, [pathname, stepIndex, isWizardEnabled]);

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
  const isCurrentRoute =
    !!currentStep &&
    !isPublicRoute &&
    (pathname === currentStep.target || pathname.endsWith(currentStep.target));

  if (!isWizardEnabled || !currentStep || !isCurrentRoute) {
    return null;
  }


  return (
    <AnimatePresence>
      <motion.div
        key={stepIndex}
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={springCinematic}
        className="fixed bottom-4 right-4 left-4 w-auto max-w-sm z-[200] sm:bottom-6 sm:left-auto sm:right-6 sm:w-full"
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
                {!currentStep.hideNext && (
                  <Button onClick={handleNext} className="rounded-full shadow-lg">
                    {stepIndex < steps.length - 1 ? 'Next' : 'Finish'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
