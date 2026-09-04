import React from 'react';
import ExamCountdown from '../components/ExamCountdown';
import DailyPlan from '../components/DailyPlan';
import AccuracyChart from '../components/AccuracyChart';
import AddKnowledgePanel from '../components/AddKnowledgePanel';

export default function Home() {
  return (
    <div className="flex gap-5 px-5 py-5 h-full">
      {/* Left 70% — dashboard */}
      <div className="flex-[7] min-w-0 flex flex-col gap-4 overflow-y-auto">
        <ExamCountdown />
        <DailyPlan />
        <AccuracyChart />
      </div>

      {/* Right 30% — knowledge input */}
      <div className="flex-[3] min-w-0 flex flex-col">
        <AddKnowledgePanel />
      </div>
    </div>
  );
}
