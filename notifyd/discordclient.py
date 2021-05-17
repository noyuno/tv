import asyncio
import discord
import sys
import textwrap
import io
import base64

import requests

class DiscordClient(discord.Client):
    def __init__(self, channelname, sendqueue, logger, receive, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.bg_task = self.loop.create_task(self.send_task())
        self.channelname = channelname
        self.channel = None
        self.sendqueue = sendqueue
        self.logger = logger
        self.receive = receive

    async def on_ready(self):
        self.logger.debug('logged in as {0.user}'.format(self))
        cand = [channel for channel in self.get_all_channels() if channel.name == self.channelname]
        if len(cand) == 0:
            raise Exception("channel {0} not found".format(self.channelname))
        self.channel = cand[0]
        await self.channel.send('hello this is notifyd')

    async def on_message(self, message):
        try:
            if message.author == self.user:
                return
            if message.channel.name != self.channelname:
                return
            if message.content == 'hi':
                await message.channel.send('hi')
            else:
                if self.receive != None:
                    req = requests.post(self.receive, json=message)
        except Exception as e:
            msg = 'on_message()'
            self.logger.exception(msg, stack_info=True)
            self.sendqueue.put({'message': 'error {}: {}({})'.format(msg, e.__class__.__name__, str(e)) })

    async def send_message(self, message):
        await self.channel.send(message)

    async def send_message_embed(self, message, q):
        e = discord.Embed()
        anyembed = False
        fileinstance = None
        if q.get('title') is not None:
            e.title = q.get('title')
            anyembed = True
        if q.get('description') is not None:
            e.description = q.get('description')
            anyembed = True
        if q.get('url') is not None:
            e.url = q.get('url')
            anyembed = True
        if q.get('color') is not None:
            e.color = q.get('color')
            anyembed = True
        if q.get('image') is not None:
            e.set_image(url=q.get('image'))
            anyembed = True
        if q.get('thumbnail') is not None:
            e.set_image(url=q.get('thumbnail'))
            anyembed = True
        if q.get('video') is not None:
            e.set_image(url=q.get('video'))
            anyembed = True
        if q.get('fields') is not None:
            for field in q.get('fields'):
                if field.get('name') and field.get('value'):
                    inline = field.get('inline') if field.get('inline') is not None else True
                    e.add_field(name=field['name'], value=field['value'], inline=inline)
                    anyembed = True
        if q.get('imagefile') is not None:
            image_byte = base64.b64decode(q.get('imagefile'))
            buffered = io.BytesIO(image_byte)
            fileinstance = discord.File(buffered, 'image.png')
        if anyembed:
            await self.channel.send(message, embed=e, file=fileinstance)
        else:
            await self.channel.send(message, file=fileinstance)

    async def send_task(self):
        await self.wait_until_ready()
        # wait login
        while (not self.is_ready()) or (self.channel is None):
            await asyncio.sleep(1)
        # main loop
        # this loop must catch exception
        while not self.is_closed():
            try:
                await asyncio.sleep(1)
                if not self.sendqueue.empty():
                    q = self.sendqueue.get()
                    if q.get('message') is not None:
                        messages = textwrap.wrap(q.get('message'), width=2000, replace_whitespace=False)
                        line = 0
                        while line < len(messages):
                            if line == 0:
                                await self.send_message_embed(messages[line], q)
                            else:
                                await self.send_message(messages[line])
                            line += 1
                    else:
                        await self.send_message_embed(None, q)
                    self.logger.debug('sent message data ({0}) to channel {1}'.format(', '.join(q.keys()), self.channel.name))
            except Exception as e:
                msg = 'send_task()'
                self.logger.exception(msg, stack_info=True)
                try:
                    await self.channel.send('error {}: {}({})'.format(msg, e.__class__.__name__, str(e)))
                except Exception as e:
                    msg = 'except in send_task()'
                    self.logger.exception(msg, stack_info=True)

