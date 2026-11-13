# Run challenge 17 as a class: a facilitator guide

This is the same guide as chapter 39.8 of the course AWS in Practice, kept here so that it travels with the code. The chapter numbers below (39.1 to 39.7) are chapters of that course.

You are at the front of the room: a teacher, a mentor, or a student who runs a study group. This plan turns challenge 17 into a live session. If you are working alone, skim it for the questions in "Ask before you run" and use them on yourself.

The session works because of one habit: **predict, then run**. Students write down what they think will happen before every experiment. The room then has something to be wrong about, and being wrong in public about a queue is how the idea stays.

Cost: 0 dollars, runs on the emulator. No student needs an AWS account or a card.

## The shape of the session

Six blocks, 180 minutes. The build block is long because it holds parts 1 to 4 of the challenge, and it has a break in the middle.

| Block | Minutes | Challenge parts | Who types |
|---|---|---|---|
| Story and the picture | 15 | course chapter 39.1 and the block map in 39.2 | you, on the projector |
| Build | 85 | parts 1 to 4, with a 10 minute break after part 2. Tight: the part times add up to 100 minutes for a learner alone | students, you one step ahead |
| The page | 15 | part 5 | students |
| Watch it | 15 | part 6, the alarm only if short of time | students |
| Break it | 40 | part 7, four experiments and the fix | everyone, one experiment at a time |
| Debrief | 10 | the table in 39.6, "What differs on real AWS" | discussion |

**A two hour version.** Before the session, run `python tools/run_readme.py 1 2` yourself on the projector laptop and ask students to do the same as their first step. That builds the stores and the queue in two minutes. Start the room at part 3, the Access Denied, which is the best opening the challenge has. Do part 4's two "your turn" pieces together on the projector, give part 5 five minutes, skip to the alarm in part 6, and keep the full 40 minutes for part 7. Do not cut the experiments to save the build. The experiments are the lesson.

## Before the session

Send this to students three days ahead, and check it yourself on the machine you will project from.

1. Install Docker Desktop (Windows, macOS) or Docker Engine with the Compose plugin (Linux), and give Docker at least 4 GB of memory.
2. Make your own copy of the public template `ZeeshanAdilButt/aws-challenges` and clone it.
3. In `challenges/challenge-17-file-storage/`, run the two commands below once, at home, on good internet. The first build downloads about 1 GB. Thirty laptops doing that on one classroom network at the same minute will cost you the first half hour.

```
docker compose --profile ui up -d --build
docker compose exec lab python tools/guard.py
```

The second command must print the Safe line. A student who shows you that line at the door is ready.

On the day, bring the three addresses on a slide: the lab shell command `docker compose exec lab bash`, the console at http://127.0.0.1:8091 and, from part 5, the drive at http://127.0.0.1:8090. Run the whole challenge yourself the evening before. On the projector laptop, restart the emulator fresh in the morning (`docker compose --profile ui --profile web down -v`, then up again), because it slows down after a few hundred function calls.

Pair students up if laptops are weak or few. One types and one reads the answers aloud, and they swap at each part. Pairs talk, and pairs who talk find their own mistakes.

## The first five minutes

Do not start with the architecture. Start with the students' own files. Ask who uploaded something to a shared drive this week, and what the screen said while it uploaded. Somebody will remember that the file appeared at once and its preview a little later. Write that gap on the board: "uploaded" and then "ready". Tell them that by the end of the session they will have built the thing that causes it, and broken it four times.

Then say what the session is not. It is not a tour of AWS, and nobody has to remember service names. It is one small system with six services, and one idea that keeps coming back: the upload and the slow work are separated, and a queue sits between them. If a student leaves with only that sentence and can explain it to a friend, the session worked.

Give the rules of the room in three lines. Type every command yourself and read its answer before the next one. Write your guess before every experiment. When you are stuck, read the error aloud to your neighbour before you raise a hand. The last rule saves you more time than any other, because most errors in this lab say exactly what is wrong.

## What to demo and what to let them type

Demo, with students watching and not typing:

- **The story, 5 minutes.** Play the two scenes in chapter 39.1. Ask who has used a shared drive this week, and where they think the file went.
- **The picture, 10 minutes.** Open the block map in chapter 39.2. Tap each part. Break the indexer and read the verdict aloud. Leave this picture on a second screen or the whiteboard for the whole session, and point at the part you are building at each step.
- **The console, 2 minutes after part 1.** Show the bucket and the table at http://127.0.0.1:8091, so that students see that the commands made real things.

Everything else they type. Resist typing for them. Stay one command further than the room on the projector, read each answer aloud, and ask "what did yours say?" before moving on. The READMEs are written so that every answer is worth reading: `CREATING` then `ACTIVE`, the refused notification, the Access Denied.

## Ask before you run

Put each question to the room and take a show of hands before the command is run. Write the split on the board.

| Before | Ask | A common guess | What happens |
|---|---|---|---|
| Part 2, the notification | "The bucket and the queue are both mine. Will AWS let the bucket write to the queue?" | Yes, they are in my account | Refused, until the queue's own policy allows it |
| Part 3, the first upload | "The function exists and the table exists. Will the upload work?" | Yes | Access Denied. Read the four pieces of the message together |
| Part 3, after the uploads | "The files say receiving. Is something broken?" | Yes | No. Nobody reads the queue yet |
| Experiment 1 | "The indexer is off and 12 of you upload. How many uploads fail?" | Most say some or all | None. 12 of 12 are accepted |
| Experiment 2 | "One file crashes the indexer every time. What happens to the file uploaded right after it?" | It is stuck behind it | It is ready in about 2 seconds |
| Experiment 3 | "The limit is 20 a second, burst 10. I send 40 at once. How many get an answer?" | 20 | Between 11 and 14. The burst size decides, not the rate |
| Experiment 4 | "The queue hands the indexer the same note four times. How many times is the work done?" | Four | Once. Then ask which line of their own code did that |

Experiment 3 has the most tempting wrong answer, and the surprise is useful: let them argue about 20 against 10 before you run it. After experiment 4, have a student open `app/indexer/handler.py` on the projector and point at the condition they wrote in part 4.

## Where students get stuck

These are the stops that cost a room time, in the order they arrive.

| Where | What they see | What to say |
|---|---|---|
| Start | The first build is slow or fails | It should have been done at home. Pair them with a neighbour and let the build run in the background |
| Start, Windows | `the input device is not a TTY` in Git Bash | Use PowerShell for commands on your own computer |
| Any part | A command "cannot connect" | They typed it outside the lab shell. The prompt inside the lab shell shows `/drive` |
| Part 2 | `$Q` is empty and a command complains about the queue URL | The variable lives in one terminal. Run the `Q=$(...)` line again |
| Part 2 | A long command pasted in pieces | Paste the whole block. A line that ends with a backslash continues on the next line |
| Part 3 | `GET /health` through the gateway gives 500 | The `add-permission` command was skipped |
| Part 4 | Files stay on `receiving` | Read the indexer's log together. The error line names the cause |
| Part 4 | The check says a wildcard is still allowed | An action such as `s3:*` is still in their file |
| Part 7 | The alarm never fires | The alarm of part 6 was skipped. Create it and run the experiment again |
| Late | Everything is slow | The emulator has had a few hundred function calls. Restart it and run `python tools/run_readme.py 1 2 3 4` |

In that log, `ValidationException` is a mistake in the update expression, and `AccessDenied` names the action their policy forgot. Part 4 is where the room spreads out most. Give it a fixed time. When the time is up, show the conditional write on the projector and let everyone who is behind copy it. The idea matters more than who typed it. A student who is far behind at any point can catch up with `python tools/run_readme.py` followed by the part numbers they are missing. It types those parts' commands for them, and they rejoin the room at the next part.

## Keeping the room together

A room of thirty will spread out. Three habits keep it within one part of each other.

Set a checkpoint at the end of every part: the part's `check.py` printing `RESULT: PASS`. Ask for a show of hands at each one. When about two thirds of the hands are up, move on, and tell the rest to run the catch-up command during the next explanation. Waiting for everyone teaches the fast students that the session is slow.

Use the fast students. A pair that finishes a part early gets a job: walk to a pair that is stuck and ask them to read their error aloud. They must not take the keyboard. Explaining an Access Denied to someone else is better practice than finishing part 5 ten minutes early.

Watch for silent copying. A student who pastes whole blocks without reading reaches part 7 with nothing to predict. The prediction questions are your check: ask one person by name to say what the last answer meant, in their own words, before the next block. Do this three or four times in the session, not for every command.

When an experiment gives a number that differs from the one in the chapter, do not explain it away. Ask why it might differ. The throttle experiment has answered 11 and 14 of 40 requests in different runs, and working out why (tokens come back while the requests are still arriving) is a better lesson than the number.

## The debrief

Keep the last ten minutes for three questions, asked in this order, and let students answer before you do.

1. "Which of the four failures did a student of the drive notice?" (Only the throttle, as a polite refusal, and the broken file, which stayed on receiving until the fix.)
2. "Which part did the most to make that true?" (The queue. Then the condition in the indexer, then the dead-letter queue with its alarm.)
3. "What did this lab not show you?" Let them list it before you show the table "What differs on real AWS" in chapter 39.6: the network around the web server, big files, real speed, real permissions for people, and the bill.

End with what to do next: the lab board in chapter 39.7 for the same design at 300 uploads a second, the quiz and the checklist. For a group that wants to see real AWS console screens, KodeKloud's guided lab on the same topic runs on a temporary real account that they provide, and it makes a good follow-up session now that the room knows why each part is there.

## After the session

Give one piece of homework, not five. The most useful one is experiment 2 again, alone: upload a file that breaks the indexer, find the crash in the log, fix the code, and bring the file back with a redrive. A student who can do that without the README has understood the dead-letter queue, the log and the deploy step together.

For a graded course, the gate in chapter 39.10 is the assessment. It asks for the student's own numbers from part 7 beside their guesses, a spoken or written walk through one upload, and a short log. Tell students at the start that their wrong guesses are part of the evidence and cost nothing. Otherwise they will tidy the guesses afterwards, and the most honest part of the record is lost.

Keep a note of where your room got stuck and how long each block really took. The timings in this guide are a first plan. After one session you will know your own.

## If you only have a projector

No laptops in the room, or no Docker: run it as a demonstration. Do the story and the picture, then drive the challenge yourself from `python tools/run_readme.py 1 2 3 4`, stopping at each answer to ask the question from the table above. Run the four experiments live and have students write their predictions on paper first. It takes about 75 minutes. Students on phones can follow chapters 39.2 to 39.4 and play with the pictures while you run the commands.

- [ ] I ran the whole challenge myself the evening before
- [ ] Students were told to build the containers at home
- [ ] The picture from chapter 39.2 stays visible during the session
- [ ] Every experiment starts with a prediction and a show of hands
- [ ] Part 4 has a fixed time, and I show the answer when it is up
- [ ] Ten minutes are kept for the debrief

## Where the numbers come from

The timings come from the part times in the challenge README. They have not yet been tested with a full class, so treat them as a first plan and adjust after your first session. The guesses in the table are the author's expectation of a first-time room, not survey data. The outcomes in the tables are from the reference run of 2026-11-13 on the AWS Emulator, version 1.0.337.
