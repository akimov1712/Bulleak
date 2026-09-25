import { createCourseIndex } from '@/lib/content';
import { course } from './course';

/** The course index used by the app (tests build their own from fixtures). */
export const courseIndex = createCourseIndex(course);
