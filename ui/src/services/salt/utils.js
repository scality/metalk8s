const JOBS = 'JOBS';

export function isJobCompleted(result, jid) {
  return (
    result.return[0][jid] && Object.keys(result.return[0][jid]['Result']).length
  );
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
