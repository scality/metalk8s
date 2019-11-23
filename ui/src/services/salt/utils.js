const JOBS = 'JOBS';

// Jobs in LocalStorage {{{
// A job in localStorage is represented as { name, jid, completedAt }

export function listJobsFromLocalStorage() {
  return JSON.parse(localStorage.getItem(JOBS)) || [];
}

function saveJobsToLocalStorage(jobs) {
  localStorage.setItem(JOBS, JSON.stringify(jobs));
}

export function addJobToLocalStorage({ jid, name, completedAt = null }) {
  const jobs = listJobsFromLocalStorage();
  const job = jobs.find(item => item.jid === jid);
  if (!job) {
    jobs.push({ jid, name, completedAt });
    saveJobsToLocalStorage(jobs);
  }
}

export function removeJobFromLocalStorage(jid) {
  const existingJobs = listJobsFromLocalStorage();
  const jobs = existingJobs.filter(job => job.jid !== jid);
  if (jobs.length) {
    saveJobsToLocalStorage(jobs);
  } else {
    localStorage.removeItem(JOBS);
  }
}

export function markJobCompleteInLocalStorage(jid, completedAt) {
  const jobs = listJobsFromLocalStorage();
  const job = jobs.find(item => item.jid === jid);
  if (job) {
    job.completedAt = completedAt;
  }
  saveJobsToLocalStorage(jobs);
}

// }}}

// Status of a job {{{

// Parse only first error level
export function parseJobError(returner) {
  const steps = Object.values(returner.return.data)[0];
  let firstFailedStepIndex = Infinity;
  let firstFailedStepKey;
  Object.keys(steps).forEach(key => {
    if (!steps[key].result && steps[key].__run_num__ < firstFailedStepIndex) {
      firstFailedStepIndex = steps[key].__run_num__;
      firstFailedStepKey = key;
    }
  });

  if (firstFailedStepKey) {
    const failedStep = steps[firstFailedStepKey];
    const stepID = firstFailedStepKey.split('_|-')[1];
    return { step: stepID, comment: failedStep.comment };
  }
}

export function getJobStatusFromPrintJob(result, jid) {
  let status = {
    completed: false
  };

  const job = result.return[0][jid];

  if (job && Object.keys(job['Result']).length) {
    status.completed = true;
    const returner = Object.values(job['Result'])[0].return;
    status.success = returner.success;

    if (!status.success) {
      status = { ...status, ...parseJobError(returner) };
    }
  }

  return status;
}

export function getJobStatusFromEventRet(result) {
  let status = {
    completed: true
  };
  status.success = result.success;

  if (!status.success) {
    status = { ...status, ...parseJobError(result) };
  }
  return status;
}
// }}}
