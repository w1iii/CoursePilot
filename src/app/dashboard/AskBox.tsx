"use client";

import { useState } from "react";
import LoomOrbit, { type OrbitCourse } from "./LoomOrbit";

type CourseOption = OrbitCourse;

interface Props {
  userName: string;
  courses: CourseOption[];
}

export default function AskBox({ userName, courses }: Props) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");

  function selectCourse(course: OrbitCourse) {
    setCourseId(course.id);
  }

  return (
    <section id="ask-habi" className="relative mx-auto flex w-full max-w-[900px] justify-center">
      <div className="relative z-10 flex w-full flex-col items-center">
        <div className="flex w-full max-w-[820px] flex-col justify-between space-y-space-lg">
          <div className="grid items-center gap-space-sm sm:grid-cols-[minmax(220px,300px)_1fr]">
            <div className="flex items-center justify-center">
              <LoomOrbit
                compact
                courses={courses}
                activeCourseId={courseId}
                onSelectCourse={selectCourse}
                onHubClick={() => undefined}
              />
            </div>
            <div className="space-y-space-sm text-center sm:text-left">
              <h1 className="mb-2 font-display text-[32px] leading-tight tracking-tight text-primary-container sm:text-[36px] lg:text-[40px]">
                Magandang araw, {userName}
              </h1>
            </div>
          </div>

        </div>
      </div>

      {courses.length === 0 && (
        <p className="absolute top-full mt-space-sm w-full text-center font-body-sm text-body-sm text-text-muted">
          <a href="#canvas" className="underline decoration-tertiary-container underline-offset-4">
            Connect Canvas
          </a>{" "}
          below to import courses, tasks, and announcements.
        </p>
      )}

    </section>
  );
}
