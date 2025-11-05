# .claude Directory - HostMetrics Context System

This directory contains the context files that help Claude Code and Claude Chat understand the HostMetrics project without requiring you to explain everything in each conversation.

---

## 📁 Directory Structure

```
.claude/
├── skills/                          # Project-specific skills (shared with team)
│   ├── hostmetrics-context.md       # Project overview, tech stack, timeline
│   ├── hostmetrics-schema.md        # Complete database schema with examples
│   └── hostmetrics-conventions.md   # Code style, API formats, patterns
├── PROJECT.md                       # Quick project reference
├── TASKS.md                         # Current sprint tasks (update daily)
├── CONVENTIONS.md                   # Quick conventions reference
└── README.md                        # This file
```

---

## 🎯 What This System Does

### The Problem It Solves
Without this context system, every new Claude conversation requires:
- Re-explaining what HostMetrics is
- Describing the tech stack
- Sharing the database schema
- Explaining code conventions
- Repeating current sprint goals

**With this system:** Claude instantly knows all of this in every conversation.

---

## 📚 File Purposes

### `/skills/` - Persistent Knowledge (Rarely Changes)

#### `hostmetrics-context.md`
**Contains:** Project overview, business problem, tech stack, timeline, team info, architectural decisions

**Use Case:** "What project am I working on? What's the current sprint?"

**Update When:**
- Major architectural decisions change
- Tech stack additions
- Sprint transitions
- Team changes

#### `hostmetrics-schema.md`
**Contains:** All 12 database tables, relationships, common queries, RLS patterns

**Use Case:** "How do I query properties with their owners?"

**Update When:**
- Database schema changes
- New tables added
- Relationships modified

#### `hostmetrics-conventions.md`
**Contains:** File structure, naming conventions, API response format, error handling, TypeScript patterns

**Use Case:** "Generate a new API endpoint following project conventions"

**Update When:**
- Code style decisions change
- New patterns established
- Team agrees on new conventions

---

### Root `.claude/` Files - Current State (Changes Frequently)

#### `PROJECT.md`
**Contains:** High-level quick reference with links to detailed skills

**Use Case:** Quick overview without reading full skills

**Update When:** Rarely (just points to skills)

#### `TASKS.md` ⭐ **UPDATE DAILY**
**Contains:** Current sprint tasks, tonight's work, blockers, questions

**Use Case:** "What should I work on right now?"

**Update When:**
- Start of coding session (review priorities)
- End of coding session (check off completed work)
- Blockers arise
- Questions for teammates

#### `CONVENTIONS.md`
**Contains:** Quick reference to most common patterns

**Use Case:** Quick lookup without reading full conventions skill

**Update When:** Rarely (just a quick ref)

---

## 🚀 How to Use This System

### Starting a New Claude Code Session

1. **Open Claude Code Desktop**
2. **Your project automatically loads:**
   - Claude Code reads `.claude/PROJECT.md`
   - Claude Code reads `.claude/TASKS.md`
   - Claude Code reads all skills in `.claude/skills/`

3. **Start coding:**
   ```
   You: "Work on the Properties CRUD API"
   
   Claude Code: [Already knows the project, schema, and conventions]
   "I'll create the Properties CRUD endpoints following your API format..."
   [Creates files matching your structure and conventions]
   ```

### Starting a New Claude Chat Session (Planning/Portfolio)

1. **Open Claude.ai**
2. **Skills are automatically available** (if you've enabled user skills)
3. **Start conversation:**
   ```
   You: "Help me plan the Client-Properties junction table implementation"
   
   Claude Chat: [Reads your skills]
   "Based on your schema, client_properties handles many-to-many relationships 
   with is_primary and commission_rate_override..."
   ```

---

## 📝 Daily Workflow

### Start of Day
```bash
# Open your current tasks
code .claude/TASKS.md

# Review:
# - What did I finish yesterday?
# - What's my priority today?
# - Any blockers?

# Update priorities if needed
```

### During Coding
```bash
# Claude Code automatically reads all context
# Just focus on coding

# If you discover a blocker:
code .claude/TASKS.md  # Add to Blockers section
```

### End of Day
```bash
# Update tasks
code .claude/TASKS.md

# Check off completed work:
- [x] Properties CRUD API implemented
- [x] Properties list page created

# Add tomorrow's priorities:
- [ ] Client status management
- [ ] Client notes UI
```

---

## 🔄 When to Update What

### Skills (`/skills/`) - Infrequent Updates

**Update when:**
- ✅ Major architecture change (e.g., many-to-many relationship)
- ✅ Database schema change (table added/modified)
- ✅ New tech added (e.g., Redis caching)
- ✅ Sprint transition (update "Current Sprint" in context)
- ✅ Code convention established (new pattern agreed upon)

**Don't update for:**
- ❌ Daily task changes (use `TASKS.md` instead)
- ❌ Minor bug fixes
- ❌ Feature tweaks

### TASKS.md - Daily Updates

**Update when:**
- ✅ Start of coding session (priorities)
- ✅ End of coding session (check off work)
- ✅ Blocker arises
- ✅ Question for teammate
- ✅ Sprint planning meeting

---

## 🤝 Team Collaboration

### Why Skills Are Committed to Git

**Benefits:**
- ✅ Hussein gets the same context automatically
- ✅ Version controlled (see how project evolved)
- ✅ Team stays aligned on conventions
- ✅ New team members onboard instantly

### What to Commit
```bash
# ✅ Always commit
.claude/skills/                # Everyone needs these
.claude/PROJECT.md             # Quick reference
.claude/CONVENTIONS.md         # Conventions reference

# ✅ Usually commit (team may have different tasks)
.claude/TASKS.md               # Current sprint work
```

---

## 🎓 Learning Resources

### Understanding Skills
Skills are persistent knowledge modules that Claude can reference across conversations. Think of them as a "memory" that survives past conversation history limits.

**Key Concepts:**
- **User Skills** (`.claude/skills/`) - Project-specific, committed to Git
- **Personal Skills** (Claude.ai settings) - Global across all projects
- **Public Skills** (Built-in) - Provided by Anthropic (e.g., docx, pdf)

### Best Practices

**Keep Skills Focused:**
```
✅ Good: Three 500-token skills
   - Context (project overview)
   - Schema (database)
   - Conventions (code style)

❌ Bad: One 2000-token skill
   - Everything (too much context)
```

**Use Examples:**
```
✅ Good: Show query examples
   "To get properties with owners:
    SELECT p.*, json_agg(...) FROM properties..."

❌ Bad: Just describe
   "You can join properties with clients"
```

**Link Skills:**
```
✅ Good: Reference other skills
   "For database details, see hostmetrics-schema.md"

❌ Bad: Duplicate content across skills
```

---

## 🔍 Troubleshooting

### "Claude doesn't seem to know my project"

**Check:**
1. Are skills in `.claude/skills/` directory?
2. Are file extensions `.md`?
3. Have you restarted Claude Code since adding skills?

**Fix:**
```bash
# Verify skills exist
ls -la .claude/skills/

# Restart Claude Code
# (Close and reopen the application)
```

### "Context is outdated"

**Fix:**
```bash
# Update the relevant skill
code .claude/skills/hostmetrics-context.md

# Edit "Current Sprint" section
# Save and commit
git add .claude/skills/
git commit -m "Update sprint status"
```

### "Too much context / Claude is slow"

**Fix:**
```bash
# Split large skills into focused modules
# Keep each skill under 1000 tokens
# Use links to reference related content
```

---

## 📊 Context System Metrics

**Current Setup:**
- **3 skills** (~1500 tokens each) = ~4500 tokens total
- **4 reference files** (~500 tokens each) = ~2000 tokens total
- **Total context:** ~6500 tokens (well within limits)

**Token Budget:**
- Claude Code: ~20,000 tokens available
- Claude Chat: ~200,000 tokens available
- **Conclusion:** Plenty of room for more context if needed

---

## 🎯 Quick Commands

### View Context Structure
```bash
tree .claude/
```

### Update Tasks
```bash
code .claude/TASKS.md
```

### Edit Skills
```bash
# Project overview
code .claude/skills/hostmetrics-context.md

# Database schema
code .claude/skills/hostmetrics-schema.md

# Code conventions
code .claude/skills/hostmetrics-conventions.md
```

### Commit Changes
```bash
git add .claude/
git commit -m "Update project context"
git push
```

---

## 🚀 Next Steps

**You're all set!** Your context system is configured and ready.

**What happens next:**
1. Start Claude Code Desktop
2. Claude automatically loads all context
3. Start coding with full project knowledge
4. Update `TASKS.md` as you work
5. Come back to Mentor Claude for portfolio transformation

**Pro Tip:** After tonight's coding session, come back to Claude Chat with:
```
"I just implemented Properties CRUD. Here's what I built: [summary]
Help me write resume bullets."
```

Mentor Claude will transform your work into portfolio-quality content.

---

**Happy coding! 🎉**