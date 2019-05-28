const JOBS = 'JOBS';

export function isJobCompleted(result, jid) {
  return (
    result.return[0][jid] && Object.keys(result.return[0][jid]['Result']).length
  );
}

export function getJobErrorStatus(returner, status) {
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
    const step_id = firstFailedStepKey.split('_|-')[1];
    status.step_id = step_id;
    status.comment = failedStep.comment;
  }
}
export function getJobStatusFromPrintJob(result, jid) {
  const status = {
    completed: false
  };

  const job = result.return[0][jid];

  if (job && Object.keys(job['Result']).length) {
    status.completed = true;
    const returner = Object.values(job['Result'])[0].return;
    const success = returner.success;
    status.success = success;
    if (!success) {
      getJobErrorStatus(returner, status);
    }
  }
  return status;
}

export function getJobStatusFromEventRet(result) {
  const status = {
    completed: true
  };
  const success = result.success;
  status.success = success;
  if (!success) {
    getJobErrorStatus(result, status);
  }
  return status;
}

export function getJidFromNameLocalStorage(name) {
  const jobs = JSON.parse(localStorage.getItem(JOBS)) || [];
  const job = jobs.find(job => job.name === name);
  return job && job.jid;
}

export function getNameFromJidLocalStorage(jid) {
  const jobs = JSON.parse(localStorage.getItem(JOBS)) || [];
  const job = jobs.find(job => job.jid === jid);
  return job && job.name;
}

export function updateJobLocalStorage(jid, name) {
  const jobs = JSON.parse(localStorage.getItem(JOBS)) || [];
  jobs.push({ jid, name });
  localStorage.setItem(JOBS, JSON.stringify(jobs));
}

export function removeJobLocalStorage(jid) {
  let jobs = JSON.parse(localStorage.getItem(JOBS)) || [];
  jobs = jobs.filter(job => job.jid !== jid);
  if (jobs.length) {
    localStorage.setItem(JOBS, JSON.stringify(jobs));
  } else {
    localStorage.removeItem(JOBS);
  }
}
