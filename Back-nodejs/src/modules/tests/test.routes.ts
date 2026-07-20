import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { Role } from '@prisma/client';
import * as testController from './test.controller';
import * as questionController from './question.controller';
import * as submissionController from './submission.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── Recruiter Routes (manage tests) ──────────────────────────────────────────

const recruiterRouter = Router();
recruiterRouter.use(authorize(Role.RECRUITER));

recruiterRouter.post('/', testController.createTest);
recruiterRouter.get('/my', testController.listMyTests);
recruiterRouter.get('/:id', testController.getTest);
recruiterRouter.patch('/:id', testController.updateTest);
recruiterRouter.delete('/:id', testController.archiveTest);
recruiterRouter.post('/:id/submit-for-review', testController.submitForReview);
recruiterRouter.get('/:id/submissions', testController.getTestSubmissions);


// Questions
recruiterRouter.post('/:testId/questions', questionController.addQuestion);
recruiterRouter.patch('/:testId/questions/:questionId', questionController.updateQuestion);
recruiterRouter.delete('/:testId/questions/:questionId', questionController.deleteQuestion);

// Submissions (grading)
recruiterRouter.patch('/submissions/:submissionId/grade', submissionController.gradeSubmission);

// ─── Candidate Routes (take tests) ────────────────────────────────────────────

const candidateRouter = Router();
candidateRouter.use(authorize(Role.CANDIDATE));

candidateRouter.get('/', testController.listPublishedTests);
candidateRouter.get('/:id', testController.getPublishedTest);
candidateRouter.post('/:testId/submissions', submissionController.startSubmission);
candidateRouter.get('/:testId/submissions/my', submissionController.getMySubmission);
candidateRouter.post('/submissions/:submissionId/answers', submissionController.submitAnswers);
candidateRouter.post('/submissions/:submissionId/submit', submissionController.finalizeSubmission);

// Subscriptions
candidateRouter.post('/:testId/subscribe', submissionController.subscribeToTest);
candidateRouter.get('/subscriptions/my', submissionController.getMySubscriptions);

// ─── Admin Routes (review tests) ─────────────────────────────────────────────

const adminRouter = Router();
adminRouter.use(authorize(Role.ADMIN));

adminRouter.get('/tests/pending', testController.listPendingTests);
adminRouter.get('/tests/:id', testController.getTest);
adminRouter.post('/tests/:id/approve', testController.approveTest);
adminRouter.post('/tests/:id/reject', testController.rejectTest);

// Subscriptions
adminRouter.get('/subscriptions/pending', submissionController.listPendingSubscriptions);
adminRouter.post('/subscriptions/:id/approve', submissionController.approveSubscription);
adminRouter.post('/subscriptions/:id/reject', submissionController.rejectSubscription);

// ─── Main Router Mounts ──────────────────────────────────────────────────

router.use('/recruiter', recruiterRouter);
router.use('/candidate', candidateRouter);
router.use('/admin', adminRouter);

export default router;
