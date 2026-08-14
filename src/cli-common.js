import chalk from 'chalk';

export function createCliLog() {
  return {
    info(msg) { console.log(msg); },
    chalk: {
      green(msg) { console.log(chalk.green(msg)); },
      dim(msg) { console.log(chalk.dim(msg)); },
    },
  };
}

export function parseAddRepoOptions(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option !== '--id' && option !== '--description') {
      throw new Error(`Unknown option: ${option}`);
    }

    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${option} requires a value.`);
    }

    options[option.slice(2)] = value;
    index += 1;
  }

  return options;
}
