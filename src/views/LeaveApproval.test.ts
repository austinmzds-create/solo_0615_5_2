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

const findBatchApproveButton = (wrapper: any) => {
  return wrapper.findAll('button').find((btn: any) => btn.text().includes('批量通过'))
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

  describe('批量通过', () => {
    it('勾选两条待审批后点击批量通过，localStorage里状态都变已通过，已选项清空且按钮禁用', async () => {
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

      const batchApproveBtn = findBatchApproveButton(wrapper)
      expect(batchApproveBtn.exists()).toBe(true)
      expect(batchApproveBtn.attributes('disabled')).toBeUndefined()

      await batchApproveBtn.trigger('click')
      await vi.advanceTimersByTimeAsync(100)
      await wrapper.vm.$nextTick()

      const storedApps = getStoredApplications()
      for (const id of pendingIds) {
        const app = storedApps.find(a => a.id === id)
        expect(app).toBeDefined()
        expect(app!.status).toBe('approved')
      }

      const pendingSelectedIds = wrapper.vm.pendingSelectedIds
      expect(pendingSelectedIds.length).toBe(0)

      const selectedIds = wrapper.vm.selectedIds
      expect(selectedIds.size).toBe(0)

      await wrapper.vm.$nextTick()
      const batchApproveBtnAfter = findBatchApproveButton(wrapper)
      expect(batchApproveBtnAfter.attributes('disabled')).toBeDefined()
    })
  })

  describe('批量操作互不串状态', () => {
    it('先批量通过两条，再批量驳回另外两条，各自状态正确互不影响', async () => {
      const confirmSpy = vi.spyOn(ElMessageBox, 'confirm')
      confirmSpy.mockResolvedValue(true as any)

      const wrapper = mountLeaveApproval()
      await vi.advanceTimersByTimeAsync(100)
      await wrapper.vm.$nextTick()

      const initialApps = getInitialApplications()
      const pendingIds = initialApps.filter(a => a.status === 'pending').slice(0, 4).map(a => a.id)
      expect(pendingIds.length).toBe(4)

      const approveIds = pendingIds.slice(0, 2)
      const rejectIds = pendingIds.slice(2, 4)

      for (const id of approveIds) {
        const checkbox = findCheckboxByRowId(wrapper, id)
        expect(checkbox.exists()).toBe(true)
        await checkbox.setValue(true)
        await wrapper.vm.$nextTick()
      }

      const batchApproveBtn = findBatchApproveButton(wrapper)
      await batchApproveBtn.trigger('click')
      await vi.advanceTimersByTimeAsync(100)
      await wrapper.vm.$nextTick()

      let storedApps = getStoredApplications()
      for (const id of approveIds) {
        const app = storedApps.find(a => a.id === id)
        expect(app).toBeDefined()
        expect(app!.status).toBe('approved')
      }
      for (const id of rejectIds) {
        const app = storedApps.find(a => a.id === id)
        expect(app).toBeDefined()
        expect(app!.status).toBe('pending')
      }

      for (const id of rejectIds) {
        const checkbox = findCheckboxByRowId(wrapper, id)
        expect(checkbox.exists()).toBe(true)
        await checkbox.setValue(true)
        await wrapper.vm.$nextTick()
      }

      const batchRejectBtn = findBatchRejectButton(wrapper)
      await batchRejectBtn.trigger('click')
      await vi.advanceTimersByTimeAsync(100)
      await wrapper.vm.$nextTick()

      storedApps = getStoredApplications()
      for (const id of approveIds) {
        const app = storedApps.find(a => a.id === id)
        expect(app).toBeDefined()
        expect(app!.status).toBe('approved')
      }
      for (const id of rejectIds) {
        const app = storedApps.find(a => a.id === id)
        expect(app).toBeDefined()
        expect(app!.status).toBe('rejected')
      }

      const pendingSelectedIds = wrapper.vm.pendingSelectedIds
      expect(pendingSelectedIds.length).toBe(0)
    })
  })
})
