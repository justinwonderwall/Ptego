import React from 'react';
import ExamCountdown from '../components/ExamCountdown';
import DailyPlan from '../components/DailyPlan';
import AccuracyChart from '../components/AccuracyChart';
import AddKnowledgePanel from '../components/AddKnowledgePanel';
import TodoList from '../components/TodoList';

export default function Home() {
  return (
    <div className="flex gap-5 px-5 py-5 h-full">
      {/* Left 70% — dashboard */}
      <div className="flex-[7] min-w-0 flex flex-col gap-4 overflow-y-auto">
        <ExamCountdown />
        <DailyPlan />
        <AccuracyChart />
      </div>

      {/* Right 30% — todo list + knowledge input, each sized to its own
          content rather than stretched to fill the column; the column
          itself scrolls if the two together run taller than the viewport.
          AI 答疑 lives as a global floating widget now (see FloatingAiChat,
          mounted in main.jsx) so it's available from every page, not just
          this one. */}
      <div className="flex-[3] min-w-0 flex flex-col gap-4 overflow-y-auto">
        <TodoList />
        <AddKnowledgePanel />
      </div>
    </div>
  );
}
