import asyncio
import threading
import os
import sys
import queue
import schedule
import time
import logging
from datetime import datetime
import dotenv

import util
import discordclient
import api

def initlogger():
    logdir = 'logs/notifyd'
    os.makedirs(logdir, exist_ok=True)
    starttime = datetime.now().strftime('%Y%m%d-%H%M')
    logging.getLogger().setLevel(logging.WARNING)
    logger = logging.getLogger('notifyd')
    if os.environ.get('DEBUG'):
        logger.setLevel(logging.DEBUG)
    else:
        logger.setLevel(logging.INFO)
    logFormatter = logging.Formatter(fmt='%(asctime)s %(levelname)s: %(message)s',
                                     datefmt='%Y%m%d-%H%S')
    fileHandler = logging.FileHandler('{}/{}'.format(logdir, starttime))
    fileHandler.setFormatter(logFormatter)
    logger.addHandler(fileHandler)
    consoleHandler = logging.StreamHandler()
    consoleHandler.setFormatter(logFormatter)
    logger.addHandler(consoleHandler)
    return logger, starttime

def main(logger):
    envse = ['DISCORD_TOKEN', 'DISCORD_CHANNEL_NAME', 'NOTIFYD_TOKEN']
    envsc = ['PORT', 'RECEIVE']

    dotenv.load_dotenv()
    f = util.environ(envse, 'error')
    util.environ(envsc, 'warning')
    if f:
        logger.error('error: some environment variables are not set. exiting.')
        sys.exit(1)

    sendqueue = queue.Queue()

    httploop = asyncio.new_event_loop()
    ap = api.API(httploop, sendqueue, logger, os.environ.get('NOTIFYD_TOKEN'))
    threading.Thread(target=ap.run, name='api', daemon=True).start()

    logger.debug('launch discord client')
    client = discordclient.DiscordClient(os.environ.get('DISCORD_CHANNEL_NAME'), sendqueue, logger, os.environ.get('RECEIVE'))
    client.run(os.environ.get('DISCORD_TOKEN'))

if __name__ == '__main__':
    logger, starttime = initlogger()
    logger.info('started notifyd at {0}'.format(starttime))
    main(logger)

