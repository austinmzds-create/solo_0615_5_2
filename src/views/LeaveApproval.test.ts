import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ElementPlus, { ElMessageBox } from 'element-plus'
import { createRouter, createMemoryHistory } from 'vue-router'
import LeaveApproval from './LeaveApproval.vue'
import { STORAGE_KEY, getInitialApplications, type LeaveApplication } from '../mock/leaves'
import { mockUsers } from '../mock/accounts'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/login', component: { template: '<div>Login</div>' } }]
})

const mountLeaveApproval = () => {
  return mount(LeaveApproval, {
    global: {
      plugins: [ElementPlus, router]
    }
  })
}

const findCheckboxByRowId = (wrapper: any, id: string) => {
  const rows = wrapper.findAll('tr')
  for (const row of rows) {
    const text = row.text()
    if (text.includes(id)) {
      return row.find('input[type="checkbox"]')
    }
  }
  return null
}

const findBatchRejectButton = (wrapper: any) => {
  return wrapper.findAll('button').find((btn: any) => btn.text().includes('批量驳回'))
}

const getStoredApplications = (): LeaveApplication[] => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return []
    }
  }
  return []
}

describe('LeaveApproval.vue', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('smart_campus_current_user', mockUsers[1].username)
    vi.useFakeTimers()
  })

  describe('批量驳回', () => {
    it('勾选两条待审批后点击批量驳回，localStorage里状态都变已驳回，已选项清空且按钮禁用', async () => {
      vi.spyOn(ElMessageBox, 'confirm').mockResolvedValueOnce(true as any)

      const wrapper = mountLeaveApproval()
      await vi.advanceTimersByTimeAsync(100)
      await wrapper.vm.$nextTick()

      const initialApps = getInitialApplications()
      const pendingIds = initialApps.filter(a => a.status === 'pending').slice(0, 2).map(a => a.id)
      expect(pendingIds.length).toBe(2)

      for (const id of pendingIds) {
        const checkbox = findCheckboxByRowId(wrapper, id)
        expect(checkbox.exists()).toBe(true)
        await checkbox.setValue(true)
        await wrapper.vm.$nextTick()
      }

      const batchRejectBtn = findBatchRejectButton(wrapper)
      expect(batchRejectBtn.exists()).toBe(true)
      expect(batchRejectBtn.attributes('disabled')).toBeUndefined()

      await batchRejectBtn.trigger('click')
      await vi.advanceTimersByTimeAsync(100)
      await wrapper.vm.$nextTick()

      const storedApps = getStoredApplications()
      for (const id of pendingIds) {
        const app = storedApps.find(a => a.id === id)
        expect(app).toBeDefined()
        expect(app!.status).toBe('rejected')
      }

      const pendingSelectedIds = wrapper.vm.pendingSelectedIds
      expect(pendingSelectedIds.length).toBe(0)

      const selectedIds = wrapper.vm.selectedIds
      expect(selectedIds.size).toBe(0)

      await wrapper.vm.$nextTick()
      const batchRejectBtnAfter = findBatchRejectButton(wrapper)
      expect(batchRejectBtnAfter.attributes('disabled')).toBeDefined()
    })
  })
})
