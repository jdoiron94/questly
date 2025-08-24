<script setup lang="ts">
import { quests } from '@/data/quests.json'
import { onMounted, onUnmounted, ref, watch } from 'vue'

type SkillResult = {
  id: number
  name: string
  rank: number
  level: number
  xp: number
}

type Quest = {
  name: string
  quest_points: number
  requirements: QuestRequirements
}

type QuestRequirements = {
  quests?: string[]
  skills?: string[]
  quest_points?: number
  members?: boolean
}

const CORS_ANYWHERE_URL = 'https://corsproxy.io/?'
const HISCORE_URL = 'https://secure.runescape.com/m=hiscore_oldschool/index_lite.json?player='

const SKILLS = [
  'Attack',
  'Defence',
  'Strength',
  'Hitpoints',
  'Ranged',
  'Prayer',
  'Magic',
  'Cooking',
  'Woodcutting',
  'Fletching',
  'Fishing',
  'Firemaking',
  'Crafting',
  'Smithing',
  'Mining',
  'Herblore',
  'Agility',
  'Thieving',
  'Slayer',
  'Farming',
  'Runecraft',
  'Hunter',
  'Construction',
]

let encodedUsername = ''
const username = ref<string>('')
const members = ref<boolean>(true)
const levels = ref<number[]>([0])
const completed = ref<Quest[]>([])
const completable = ref<Quest[]>(quests.slice(0))
const incompletable = ref<Quest[]>([])
const questPoints = ref<number>(0)
// const spinnerActive = ref<boolean>(false)
const error = ref(false)

// Read data from local storage on mount
onMounted(() => {
  window.addEventListener('beforeunload', saveToStorage)
  readFromStorage()
  updateQuests()
})

// Persist data to local storage on unmount
onUnmounted(() => {
  window.removeEventListener('beforeunload', saveToStorage)
})

// Update quests when members toggle changes
watch(members, () => {
  updateQuests()
})

// Update quests when player is fetched
watch(levels, () => {
  if (levels.value.length > 1) {
    readFromStorage()
    updateQuests()
  }
})

// Remove error message when username changes
watch(username, () => {
  error.value = false
})

// Update quest points when completed quests change
watch(completed, () => {
  updateQuestPoints()
})

// Update quests when quest point value changes
watch(questPoints, () => {
  updateQuests()
})

const readFromStorage = () => {
  if (typeof Storage !== 'undefined') {
    const user = !encodedUsername ? 'default' : encodedUsername
    const data = JSON.parse(localStorage.getItem(`quest_data_${user}`) ?? '{}')

    if (Object.keys(data).length) {
      const finished = []

      for (const c of data.completed) {
        const quest = quests.find((q) => q.name.toUpperCase() === c.toUpperCase())

        if (quest) {
          finished.push(quest)
        }
      }

      members.value = data.members
      completed.value = finished.sort(compareQuests)
    } else {
      members.value = true
      completed.value = []
    }
  }
}

const saveToStorage = () => {
  if (typeof Storage !== 'undefined') {
    const data = {
      members: members.value,
      completed: completed.value.map((q) => q.name),
    }
    const user = !encodedUsername ? 'default' : encodedUsername
    localStorage.setItem(`quest_data_${user}`, JSON.stringify(data))
  }
}

const hasOneOf = (requirement: string, isSkill = false) => {
  const requirements = requirement.split(' || ')

  if (isSkill) {
    for (const skill of requirements) {
      const [level, name] = skill.split(' ')
      const index = SKILLS.indexOf(name)

      if (levels.value[index] < parseInt(level)) {
        return false
      }
    }
  } else {
    for (const req of requirements) {
      if (completed.value.find((q) => q.name.toUpperCase() === req.toUpperCase())) {
        return true
      }
    }
  }

  return false
}

const hasSkillRequirements = (requirements: string[] | undefined) => {
  if (requirements === undefined || levels.value.length === 1) {
    return true
  }

  for (const skill of requirements) {
    if (skill.includes('||')) {
      return hasOneOf(skill, true)
    }

    const [level, name] = skill.split(' ')
    const index = SKILLS.indexOf(name)

    if (levels.value[index] < parseInt(level)) {
      return false
    }
  }

  return true
}

const hasQuestPointRequirement = (requirement: number | undefined) => {
  return requirement === undefined || questPoints.value >= requirement
}

const hasPrerequisites = (requirements: string[] | undefined) => {
  if (requirements === undefined) {
    return true
  }

  for (const quest of requirements) {
    if (quest.includes('||')) {
      return hasOneOf(quest)
    }

    if (!completed.value.find((q) => q.name.toUpperCase() === quest.toUpperCase())) {
      return false
    }
  }

  return true
}

const hasQuestEligibility = (requirement: boolean | undefined) => {
  return requirement === undefined || requirement === members.value
}

const canCompleteQuest = (quest: Quest) => {
  if (hasQuestEligibility(quest.requirements.members)) {
    const hasQuests = hasPrerequisites(quest.requirements.quests)
    const hasQuestPoints = hasQuestPointRequirement(quest.requirements.quest_points)
    const hasSkills = hasSkillRequirements(quest.requirements.skills)

    return hasQuests && hasQuestPoints && hasSkills
  }

  return false
}

const updateQuests = () => {
  const canComplete = []
  const cannotComplete = []

  for (const quest of quests) {
    if (!completed.value.find((q) => q.name.toUpperCase() === quest.name.toUpperCase())) {
      if (canCompleteQuest(quest)) {
        canComplete.push(quest)
      } else {
        cannotComplete.push(quest)
      }
    }
  }

  completable.value = canComplete.sort(compareQuests)
  incompletable.value = cannotComplete.sort(compareQuests)
}

const addAllToCompleted = (quest: Quest) => {
  if (quest.requirements.quests) {
    for (const q of quest.requirements.quests) {
      const req = quests.find((j) => j.name === q)
      if (req && !completed.value.find((q) => q.name.toUpperCase() === req.name.toUpperCase())) {
        completed.value.push(req)
        addAllToCompleted(req)
      }
    }
  }
}

const addToCompleted = (quest: Quest) => {
  if (!completed.value.find((q) => q.name.toUpperCase() === quest.name.toUpperCase())) {
    addAllToCompleted(quest)
    completed.value.push(quest)
    completed.value.sort(compareQuests)
    updateQuestPoints()
  }
}

const removeFromCompleted = (quest: Quest) => {
  if (levels.value.length === 1 || canCompleteQuest(quest)) {
    completable.value.push(quest)
    completable.value.sort(compareQuests)
  } else {
    incompletable.value.push(quest)
    incompletable.value.sort(compareQuests)
  }

  completed.value = completed.value.filter((q) => q !== quest).sort(compareQuests)
}

const compareQuests = (a: Quest, b: Quest) => {
  return a.name.localeCompare(b.name)
}

const updateQuestPoints = () => {
  let points = 0

  for (const quest of completed.value) {
    points += quest.quest_points
  }

  questPoints.value = points
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    fetchLevels()
  }
}

const fetchLevels = () => {
  if (!username.value.trim().length) {
    return
  }

  // setSpinnerActive(true)
  saveToStorage()
  encodedUsername = encodeURIComponent(username.value.trim())
  const fullUrl = CORS_ANYWHERE_URL + HISCORE_URL + encodedUsername
  fetch(fullUrl)
    .then((res) => {
      if (!res.ok) {
        throw new Error('Player not found')
      }
      return res.json()
    })
    .then((res) => {
      parseLevels(res.skills)
    })
    .catch(() => {
      // setSpinnerActive(false)
      error.value = true
    })
}

const parseLevels = (data: SkillResult[]) => {
  const stats = []

  for (const skill of data) {
    if (SKILLS.includes(skill.name)) {
      stats.push(skill.level)
    }
  }

  levels.value = stats
}
</script>

<template>
  <main>
    <div
      id="nav-sticky"
      uk-sticky="sel-target: .uk-navbar-container; cls-active: uk-navbar-sticky; bottom: #transparent-sticky-navbar"
    >
      <nav class="uk-navbar-container uk-margin" data-uk-navbar>
        <div class="uk-navbar-left">
          <div class="uk-navbar-item uk-logo">Questly</div>
          <div class="uk-navbar-item">
            <input
              class="uk-input uk-form-width-medium"
              type="text"
              placeholder="Username"
              v-model="username"
              @keydown="handleKeyDown"
              maxlength="12"
            />
          </div>
          <div class="uk-navbar-item">
            <button class="uk-button uk-button-primary" @click="fetchLevels">Submit</button>
          </div>
          <div class="uk-navbar-item">
            <label>
              <input
                class="uk-checkbox uk-mr-mini"
                type="checkbox"
                v-model="members"
                @click="members = !members"
              />
              Members
            </label>
          </div>
          <div class="uk-navbar-item">QP: {{ questPoints }}</div>
        </div>
      </nav>
    </div>
    <div v-show="error" id="error" data-uk-alert>
      <div className="uk-alert uk-alert-warning">
        <button className="uk-alert-close uk-icon uk-close link-button" @click="error = false">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            xmlns="http://www.w3.org/2000/svg"
            data-svg="close-icon"
          >
            <line fill="none" stroke="#000" strokeWidth="1.1" x1="1" y1="1" x2="13" y2="13"></line>
            <line fill="none" stroke="#000" strokeWidth="1.1" x1="13" y1="1" x2="1" y2="13"></line>
          </svg>
        </button>
        <p>
          No player could be found with the username <span className="bold">{{ username }}</span
          >.
        </p>
      </div>
    </div>
    <table class="uk-table uk-table-divider">
      <thead data-uk-scrollspy="cls:uk-animation-slide-top">
        <tr>
          <th>Quest</th>
          <th>Prerequisites</th>
          <th>Level Requirements</th>
          <th>Quest Points</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="quest in completable"
          :key="quest.name"
          class="completable"
          data-uk-scrollspy="cls:uk-animation-fast-uk uk-animation-fade"
        >
          <td>{{ quest.name }}</td>
          <td>
            <ul class="uk-list">
              <li v-if="quest.requirements.quest_points">
                {{ quest.requirements.quest_points }} QP
              </li>
              <li v-for="prereq in quest.requirements.quests" :key="prereq">
                {{ prereq }}
              </li>
            </ul>
          </td>
          <td>
            <ul class="uk-list">
              <li v-for="prereq in quest.requirements.skills" :key="prereq">
                {{ prereq }}
              </li>
            </ul>
          </td>
          <td>{{ quest.quest_points }}</td>
          <td><button class="uk-button" @click="addToCompleted(quest)">Done</button></td>
        </tr>
        <tr
          v-for="quest in incompletable"
          :key="quest.name"
          class="incompletable"
          data-uk-scrollspy="cls:uk-animation-fast-uk uk-animation-fade"
        >
          <td>{{ quest.name }}</td>
          <td>
            <ul class="uk-list">
              <li v-if="quest.requirements.quest_points">
                {{ quest.requirements.quest_points }} QP
              </li>
              <li v-for="prereq in quest.requirements.quests" :key="prereq">
                {{ prereq }}
              </li>
            </ul>
          </td>
          <td>
            <ul class="uk-list">
              <li v-for="prereq in quest.requirements.skills" :key="prereq">
                {{ prereq }}
              </li>
            </ul>
          </td>
          <td>{{ quest.quest_points }}</td>
          <td><button class="uk-button" @click="addToCompleted(quest)">Done</button></td>
        </tr>
        <tr
          v-for="quest in completed"
          :key="quest.name"
          class="completed"
          data-uk-scrollspy="cls:uk-animation-fast-uk uk-animation-fade"
        >
          <td>{{ quest.name }}</td>
          <td>
            <ul class="uk-list">
              <li v-if="quest.requirements.quest_points">
                {{ quest.requirements.quest_points }} QP
              </li>
              <li v-for="prereq in quest.requirements.quests" :key="prereq">
                {{ prereq }}
              </li>
            </ul>
          </td>
          <td>
            <ul class="uk-list">
              <li v-for="prereq in quest.requirements.skills" :key="prereq">
                {{ prereq }}
              </li>
            </ul>
          </td>
          <td>{{ quest.quest_points }}</td>
          <td><button class="uk-button" @click="removeFromCompleted(quest)">Remove</button></td>
        </tr>
      </tbody>
    </table>
  </main>
</template>

<style scoped></style>
