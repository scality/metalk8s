const JOBS = 'JOBS';

export function prettifyBytes(bytes, decimals) {
  var units = ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  var unit = 'B';
  var num = bytes;
  var dec = decimals !== undefined ? Math.pow(10, decimals) : 1;
  var i = 0;

  while (num >= 1024) {
    if (units[i] === undefined) {
      break;
    }
    num = num / 1024;
    unit = units[i];
    i++;
  }

  num = Math.round(num * dec) / dec;

  return {
    value: num + ' ' + unit,
    unit: unit,
    number: num
  };
}
//memory = '1882148Ki'
export function convertK8sMemoryToBytes(memory) {
  return parseInt(memory.slice(0, -2), 10) * 1024;
}

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
