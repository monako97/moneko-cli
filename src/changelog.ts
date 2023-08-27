import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { program } from 'commander';

function getRemoteUrl() {
  return execSync('git config --get remote.origin.url | sed "s/\\.git$//"').toString().trim();
}

const types: Record<string, string> = {
  feat: '✨ Features',
  fix: '🐛 Bug Fixes',
  docs: '📚 Documentation',
  style: '💎 Styles',
  refactor: '📦 Code Refactoring',
  perf: '🚀 Performance Improvements',
  test: '🚨 Tests',
  build: '🛠 Builds',
  ci: '⚙️ Continuous Integrations',
  chore: '♻️ Chores',
  revert: '🗑 Reverts',
};
function extractCommits(text: string) {
  const commits = [];
  const lines = text.trim().split('\n');

  for (const line of lines) {
    const [commitId, author, email, date, message] = line.split('|');

    if (message) {
      const _msg = message.split(': ');
      const type = types[_msg[0]];

      commits.push({
        commitId,
        author,
        email,
        date: new Date(date).toLocaleString().replace(/\//g, '-'),
        message: type ? _msg.slice(1).join(':') : message,
        type,
      });
    }
  }

  return commits;
}

function getCommitsBetweenTags(tag1?: string, tag2?: string) {
  const command = `git log ${tag1 ? `${tag1}..` : ''}${
    tag2 ? tag2 : ''
  } --format='%H|%an|%ae|%ad|%s'`;
  const output = execSync(command, { encoding: 'utf-8' });

  return extractCommits(output);
}

function getTags(remoteUrl: string) {
  const command =
    "git for-each-ref --sort='v:refname' --format '%(objectname) %(refname:short) %(creatordate:iso8601)' refs/tags";
  const output = execSync(command, { encoding: 'utf-8' });
  const arr: {
    title: string;
    commitId?: string;
    tag?: string;
    date?: string;
    logs: Record<string, string[]>;
  }[] = [];
  const lines = output.trim().split('\n');

  lines.forEach((line, i) => {
    const [commitId, tag, date] = line.split(' ');
    const preTag = lines[i - 1]?.split(' ')[1];
    let tit = `## ${tag}`;

    if (preTag) {
      tit = `## [${tag}](${remoteUrl}/compare/${preTag}...${tag}) (${new Date(date)
        .toLocaleDateString()
        .replace(/\//g, '-')})`;
    }
    arr.push({
      commitId,
      tag,
      date,
      title: tit,
      logs: {},
    });
  });

  return arr;
}
program
  .command('changelog <filename>')
  .description('生成 CHANGELOG.md')
  .action((filename) => {
    const remoteUrl = getRemoteUrl();
    const tags = getTags(remoteUrl);
    const text: string[] = ['# Change log'];

    tags.forEach((t, i) => {
      if (i) {
        const sliceLog = getCommitsBetweenTags(tags[i - 1].tag, t.tag);

        sliceLog.forEach((s) => {
          if (s.type) {
            const old = tags[i].logs[s.type] || [];

            old.push(
              `- ${s.message} ([${s.commitId.substring(0, 7)}](${remoteUrl}/commit/${s.commitId}))`
            );
            Object.assign(tags[i].logs, {
              [s.type]: old,
            });
          }
        });
      }
      if (i === tags.length - 1) {
        const otherLog = getCommitsBetweenTags(t.tag);

        if (otherLog.length) {
          tags.push({
            title: `## Last`,
            logs: {},
          });
        }
        otherLog.forEach((s) => {
          if (s.type) {
            const old = tags[i + 1].logs[s.type] || [];
            old.push(
              `- ${s.message} ([${s.commitId.substring(0, 7)}](${remoteUrl}/commit/${s.commitId}))`
            );
            Object.assign(tags[i + 1].logs, {
              [s.type]: old,
            });
          }
        });
      }
    });

    tags.reverse().forEach((e) => {
      text.push(`\n${e.title}`);

      for (const key in e.logs) {
        if (Object.prototype.hasOwnProperty.call(e.logs, key)) {
          text.push(`\n### ${key}\n`);
          e.logs[key].forEach((l) => text.push(l));
        }
      }
    });

    writeFileSync(join(process.cwd(), filename), text.join('\n'), {
      encoding: 'utf-8',
    });
  });
