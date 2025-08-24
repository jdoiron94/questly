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
  <main class="block">
    <div id="nav-sticky" class="fixed top-0 z-980 m-0 box-border h-20 w-full backface-hidden">
      <nav class="relative mb-5 flex bg-[#f8f8f8]">
        <div class="flex flex-wrap items-center">
          <div
            class="box-border flex min-h-20 items-center justify-center px-[15px] py-0 text-2xl text-[#666] decoration-0"
          >
            Questly
          </div>
          <div
            class="box-border flex min-h-20 items-center justify-center px-[15px] py-0 text-sm text-[#666] decoration-0"
          >
            <input
              class="m-0 box-border inline-block h-10 w-50 max-w-full overflow-visible rounded-none border border-[#e5e5e5] bg-[#fff] px-[10px] py-0 text-[#666]"
              type="text"
              placeholder="Username"
              v-model="username"
              @keydown="handleKeyDown"
              maxlength="12"
            />
          </div>
          <div
            class="box-border flex min-h-20 items-center justify-center px-[15px] py-0 text-sm text-[#666] decoration-0"
          >
            <button
              class="m-0 box-border inline-block cursor-pointer overflow-visible border border-transparent bg-[#1e87f0] px-[30px] py-0 text-center text-sm/[38px] text-white uppercase decoration-0"
              @click="fetchLevels"
            >
              Submit
            </button>
          </div>
          <div
            class="box-border flex min-h-20 items-center justify-center px-[15px] py-0 text-sm text-[#666] decoration-0"
          >
            <label class="">
              <input
                class="m-0 -mt-1 mr-[10px] box-border inline-block h-4 w-4 cursor-pointer overflow-hidden rounded-none border border-[#ccc] align-middle"
                type="checkbox"
                v-model="members"
                @click="members = !members"
              />
              Members
            </label>
          </div>
          <div
            class="box-border flex min-h-20 items-center justify-center px-[15px] py-0 text-sm text-[#666] decoration-0"
          >
            QP: {{ questPoints }}
          </div>
        </div>
      </nav>
    </div>
    <div v-show="error" id="error" class="relative mb-0 bg-[#f8f8f8] p-0 text-[#666]">
      <div className="relative p-[15px] pb-[1px] bg-[#fff6ee] text-[#faa05a]">
        <p class="m-0 mb-5">
          No player could be found with the username <span className="bold">{{ username }}</span
          >.
        </p>
      </div>
    </div>
    <table class="mt-20 mb-0 w-full border-collapse">
      <thead>
        <tr>
          <th class="px-3 py-4 text-left align-bottom text-sm font-normal text-[#999] uppercase">
            Quest
          </th>
          <th class="px-3 py-4 text-left align-bottom text-sm font-normal text-[#999] uppercase">
            Prerequisites
          </th>
          <th class="px-3 py-4 text-left align-bottom text-sm font-normal text-[#999] uppercase">
            Level Requirements
          </th>
          <th class="px-3 py-4 text-left align-bottom text-sm font-normal text-[#999] uppercase">
            Quest Points
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="quest in completable" :key="quest.name" class="completable">
          <td class="px-3 py-4 align-top">{{ quest.name }}</td>
          <td class="px-3 py-4 align-top">
            <ul class="m-0 mb-5 pl-[30px]">
              <li v-if="quest.requirements.quest_points">
                {{ quest.requirements.quest_points }} QP
              </li>
              <li v-for="prereq in quest.requirements.quests" :key="prereq">
                {{ prereq }}
              </li>
            </ul>
          </td>
          <td class="px-3 py-4 align-top">
            <ul class="m-0 mb-5 pl-[30px]">
              <li v-for="prereq in quest.requirements.skills" :key="prereq">
                {{ prereq }}
              </li>
            </ul>
          </td>
          <td class="px-3 py-4 align-top">{{ quest.quest_points }}</td>
          <td class="px-3 py-4 align-top">
            <button
              class="m-0 box-border inline-block cursor-pointer overflow-visible border-none px-[30px] py-0 text-center align-middle text-sm/[38px] text-white uppercase"
              @click="addToCompleted(quest)"
            >
              Done
            </button>
          </td>
        </tr>
        <tr v-for="quest in incompletable" :key="quest.name" class="incompletable">
          <td class="px-3 py-4 align-top">{{ quest.name }}</td>
          <td class="px-3 py-4 align-top">
            <ul class="m-0 mb-5 pl-[30px]">
              <li v-if="quest.requirements.quest_points">
                {{ quest.requirements.quest_points }} QP
              </li>
              <li v-for="prereq in quest.requirements.quests" :key="prereq">
                {{ prereq }}
              </li>
            </ul>
          </td>
          <td class="px-3 py-4 align-top">
            <ul class="m-0 mb-5 pl-[30px]">
              <li v-for="prereq in quest.requirements.skills" :key="prereq">
                {{ prereq }}
              </li>
            </ul>
          </td>
          <td class="px-3 py-4 align-top">{{ quest.quest_points }}</td>
          <td class="px-3 py-4 align-top">
            <button
              class="m-0 box-border inline-block cursor-pointer overflow-visible border-none px-[30px] py-0 text-center align-middle text-sm/[38px] text-white uppercase"
              @click="addToCompleted(quest)"
            >
              Done
            </button>
          </td>
        </tr>
        <tr v-for="quest in completed" :key="quest.name" class="completed">
          <td class="px-3 py-4 align-top">{{ quest.name }}</td>
          <td class="px-3 py-4 align-top">
            <ul class="m-0 mb-5 pl-[30px]">
              <li v-if="quest.requirements.quest_points">
                {{ quest.requirements.quest_points }} QP
              </li>
              <li v-for="prereq in quest.requirements.quests" :key="prereq">
                {{ prereq }}
              </li>
            </ul>
          </td>
          <td class="px-3 py-4 align-top">
            <ul class="m-0 mb-5 pl-[30px]">
              <li v-for="prereq in quest.requirements.skills" :key="prereq">
                {{ prereq }}
              </li>
            </ul>
          </td>
          <td class="px-3 py-4 align-top">{{ quest.quest_points }}</td>
          <td class="px-3 py-4 align-top">
            <button
              class="m-0 box-border inline-block cursor-pointer overflow-visible border-none px-[30px] py-0 text-center align-middle text-sm/[38px] text-white uppercase"
              @click="removeFromCompleted(quest)"
            >
              Remove
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </main>
</template>

<style scoped></style>
