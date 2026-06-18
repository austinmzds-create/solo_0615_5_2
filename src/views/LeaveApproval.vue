<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search, Refresh, View, Check, Close, SwitchButton } from '@element-plus/icons-vue'
import {
  getInitialApplications,
  saveApplications,
  type LeaveApplication,
  type LeaveStatus
} from '../mock/leaves'
import { mockUsers } from '../mock/accounts'

const router = useRouter()

const applications = ref<LeaveApplication[]>([])
const activeTab = ref<LeaveStatus | 'all'>('all')
const filterFormRef = ref<FormInstance>()
const detailVisible = ref(false)
const rejectDialogVisible = ref(false)
const currentApplication = ref<LeaveApplication | null>(null)
const rejectReason = ref('')
const rejectFormRef = ref<FormInstance>()
const tableRef = ref()
const selectedIds = ref<Set<string>>(new Set())

const filterForm = ref({
  className: '',
  studentName: '',
  courseName: '',
  dateRange: null as [string, string] | null
})

const classOptions = ['高三(1)班', '高三(2)班', '高三(3)班']
const courseOptions = ['数学', '语文', '英语', '物理', '化学']

const rejectRules: FormRules = {
  rejectReason: [{ required: true, message: '请填写驳回原因', trigger: 'blur' }]
}

const currentUser = computed(() => {
  const username = localStorage.getItem('smart_campus_current_user')
  if (!username) return null
  return mockUsers.find((u) => u.username === username) || null
})

const tabCounts = computed(() => {
  const all = applications.value.length
  const pending = applications.value.filter((a) => a.status === 'pending').length
  const approved = applications.value.filter((a) => a.status === 'approved').length
  const rejected = applications.value.filter((a) => a.status === 'rejected').length
  return { all, pending, approved, rejected }
})

const filteredApplications = computed(() => {
  let result = applications.value

  if (activeTab.value !== 'all') {
    result = result.filter((a) => a.status === activeTab.value)
  }

  if (filterForm.value.className) {
    result = result.filter((a) => a.className === filterForm.value.className)
  }
  if (filterForm.value.studentName) {
    result = result.filter(
      (a) => a.studentName.includes(filterForm.value.studentName.trim())
    )
  }
  if (filterForm.value.courseName) {
    result = result.filter((a) => a.courseName === filterForm.value.courseName)
  }
  if (filterForm.value.dateRange && filterForm.value.dateRange.length === 2) {
    const [start, end] = filterForm.value.dateRange
    result = result.filter((a) => a.startDate >= start && a.endDate <= end)
  }

  return result
})

onMounted(() => {
  if (!currentUser.value || currentUser.value.role !== 'teacher') {
    router.replace('/login')
    return
  }
  applications.value = getInitialApplications()
})

const statusTagType = (status: LeaveStatus) => {
  const map: Record<LeaveStatus, '' | 'success' | 'danger' | 'warning'> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return map[status]
}

const statusLabel = (status: LeaveStatus) => {
  const map: Record<LeaveStatus, string> = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回'
  }
  return map[status]
}

const clearSelection = () => {
  selectedIds.value = new Set()
  tableRef.value?.clearSelection()
}

const handleSearch = () => {
  clearSelection()
}

const handleReset = () => {
  filterForm.value = {
    className: '',
    studentName: '',
    courseName: '',
    dateRange: null
  }
  clearSelection()
}

watch(activeTab, () => {
  clearSelection()
})

const handleView = (row: LeaveApplication) => {
  currentApplication.value = row
  detailVisible.value = true
}

const handleApprove = async (row: LeaveApplication) => {
  try {
    await ElMessageBox.confirm('确认通过该请假申请？', '审批确认', {
      confirmButtonText: '确认通过',
      cancelButtonText: '取消',
      type: 'success'
    })
    const target = applications.value.find((a) => a.id === row.id)
    if (target) {
      target.status = 'approved'
      target.approvedAt = new Date().toLocaleString('zh-CN')
      saveApplications(applications.value)
      ElMessage.success('已通过该申请')
    }
  } catch {
    // cancelled
  }
}

const openRejectDialog = (row: LeaveApplication) => {
  currentApplication.value = row
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

const handleRejectConfirm = async () => {
  if (!rejectFormRef.value) return
  await rejectFormRef.value.validate((valid) => {
    if (!valid) return
    const target = applications.value.find(
      (a) => a.id === currentApplication.value?.id
    )
    if (target) {
      target.status = 'rejected'
      target.rejectReason = rejectReason.value
      target.approvedAt = new Date().toLocaleString('zh-CN')
      saveApplications(applications.value)
      ElMessage.warning('已驳回该申请')
    }
    rejectDialogVisible.value = false
    detailVisible.value = false
  })
}

const handleLogout = () => {
  localStorage.removeItem('smart_campus_current_user')
  router.replace('/login')
}

const handleSelectionChange = (selection: LeaveApplication[]) => {
  selectedIds.value = new Set(selection.map((r) => r.id))
}

const isRowSelectable = (row: LeaveApplication) => {
  return row.status === 'pending'
}

const pendingSelectedIds = computed(() => {
  return filteredApplications.value
    .filter((a) => a.status === 'pending' && selectedIds.value.has(a.id))
    .map((a) => a.id)
})

const handleBatchApprove = async () => {
  const count = pendingSelectedIds.value.length
  if (count === 0) {
    ElMessage.warning('请先勾选待审批的申请')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认批量通过 ${count} 条待审批申请？`,
      '批量审批确认',
      {
        confirmButtonText: '确认通过',
        cancelButtonText: '取消',
        type: 'success'
      }
    )
    const now = new Date().toLocaleString('zh-CN')
    const idSet = new Set(pendingSelectedIds.value)
    applications.value.forEach((a) => {
      if (idSet.has(a.id)) {
        a.status = 'approved'
        a.approvedAt = now
      }
    })
    saveApplications(applications.value)
    clearSelection()
    ElMessage.success(`已批量通过 ${count} 条申请`)
  } catch {
    // cancelled
  }
}
</script>

<template>
  <div class="approval-page">
    <el-container>
      <el-header class="page-header">
        <div class="header-left">
          <h1 class="page-title">请假审批管理</h1>
          <span class="teacher-name">{{ currentUser?.name }}</span>
        </div>
        <el-button :icon="SwitchButton" @click="handleLogout">退出登录</el-button>
      </el-header>

      <el-main class="page-main">
        <el-card class="filter-card" shadow="never">
          <el-form ref="filterFormRef" :model="filterForm" inline>
            <el-form-item label="班级">
              <el-select
                v-model="filterForm.className"
                placeholder="全部班级"
                clearable
                style="width: 160px"
              >
                <el-option
                  v-for="cls in classOptions"
                  :key="cls"
                  :label="cls"
                  :value="cls"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="学生姓名">
              <el-input
                v-model="filterForm.studentName"
                placeholder="请输入姓名"
                clearable
                style="width: 150px"
              />
            </el-form-item>

            <el-form-item label="课程">
              <el-select
                v-model="filterForm.courseName"
                placeholder="全部课程"
                clearable
                style="width: 140px"
              >
                <el-option
                  v-for="course in courseOptions"
                  :key="course"
                  :label="course"
                  :value="course"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="日期范围">
              <el-date-picker
                v-model="filterForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                style="width: 260px"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :icon="Search" @click="handleSearch">
                查询
              </el-button>
              <el-button :icon="Refresh" @click="handleReset">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card class="table-card" shadow="never">
          <div class="table-toolbar">
            <el-tabs v-model="activeTab">
              <el-tab-pane label="全部" name="all">
                <template #label>
                  全部 <el-badge :value="tabCounts.all" class="tab-badge" type="info" />
                </template>
              </el-tab-pane>
              <el-tab-pane label="待审批" name="pending">
                <template #label>
                  待审批 <el-badge :value="tabCounts.pending" class="tab-badge" type="warning" />
                </template>
              </el-tab-pane>
              <el-tab-pane label="已通过" name="approved">
                <template #label>
                  已通过 <el-badge :value="tabCounts.approved" class="tab-badge" type="success" />
                </template>
              </el-tab-pane>
              <el-tab-pane label="已驳回" name="rejected">
                <template #label>
                  已驳回 <el-badge :value="tabCounts.rejected" class="tab-badge" type="danger" />
                </template>
              </el-tab-pane>
            </el-tabs>
            <div class="batch-actions">
              <el-button
                type="success"
                :icon="Check"
                :disabled="pendingSelectedIds.length === 0"
                @click="handleBatchApprove"
              >
                批量通过
                <span v-if="pendingSelectedIds.length > 0">
                  ({{ pendingSelectedIds.length }})
                </span>
              </el-button>
            </div>
          </div>

          <el-table
            ref="tableRef"
            :data="filteredApplications"
            stripe
            border
            style="width: 100%"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="55" align="center" :selectable="isRowSelectable" />
            <el-table-column prop="id" label="申请编号" width="100" />
            <el-table-column prop="studentName" label="学生姓名" width="100" />
            <el-table-column prop="className" label="班级" width="120" />
            <el-table-column prop="courseName" label="课程" width="90" />
            <el-table-column prop="leaveType" label="请假类型" width="90" />
            <el-table-column label="请假时间" width="200">
              <template #default="{ row }">
                {{ row.startDate }} 至 {{ row.endDate }}
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="请假原因" min-width="160" show-overflow-tooltip />
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)" size="small">
                  {{ statusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right" align="center">
              <template #default="{ row }">
                <el-button link type="primary" :icon="View" @click="handleView(row)">
                  详情
                </el-button>
                <template v-if="row.status === 'pending'">
                  <el-button link type="success" :icon="Check" @click="handleApprove(row)">
                    通过
                  </el-button>
                  <el-button link type="danger" :icon="Close" @click="openRejectDialog(row)">
                    驳回
                  </el-button>
                </template>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-main>
    </el-container>

    <el-dialog v-model="detailVisible" title="申请详情" width="520px" destroy-on-close>
      <template v-if="currentApplication">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请编号">{{ currentApplication.id }}</el-descriptions-item>
          <el-descriptions-item label="学生姓名">{{ currentApplication.studentName }}</el-descriptions-item>
          <el-descriptions-item label="班级">{{ currentApplication.className }}</el-descriptions-item>
          <el-descriptions-item label="课程">{{ currentApplication.courseName }}</el-descriptions-item>
          <el-descriptions-item label="请假类型">{{ currentApplication.leaveType }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="statusTagType(currentApplication.status)" size="small">
              {{ statusLabel(currentApplication.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="开始日期">{{ currentApplication.startDate }}</el-descriptions-item>
          <el-descriptions-item label="结束日期">{{ currentApplication.endDate }}</el-descriptions-item>
          <el-descriptions-item label="请假原因" :span="2">{{ currentApplication.reason }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ currentApplication.submittedAt }}</el-descriptions-item>
          <el-descriptions-item v-if="currentApplication.approvedAt" label="审批时间">
            {{ currentApplication.approvedAt }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="currentApplication.status === 'rejected' && currentApplication.rejectReason"
            label="驳回原因"
            :span="2"
          >
            <span style="color: #f56c6c">{{ currentApplication.rejectReason }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <template v-if="currentApplication?.status === 'pending'">
          <el-button @click="detailVisible = false">取消</el-button>
          <el-button type="danger" @click="detailVisible = false; openRejectDialog(currentApplication!)">
            驳回
          </el-button>
          <el-button type="success" @click="detailVisible = false; handleApprove(currentApplication!)">
            通过
          </el-button>
        </template>
        <template v-else>
          <el-button @click="detailVisible = false">关闭</el-button>
        </template>
      </template>
    </el-dialog>

    <el-dialog
      v-model="rejectDialogVisible"
      title="驳回申请"
      width="440px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form ref="rejectFormRef" :model="{ rejectReason }" :rules="rejectRules">
        <el-form-item label="驳回原因" prop="rejectReason">
          <el-input
            v-model="rejectReason"
            type="textarea"
            :rows="4"
            placeholder="请填写驳回原因（必填）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleRejectConfirm">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.approval-page {
  min-height: 100vh;
  background: #f0f2f5;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  padding: 0 24px;
  height: 60px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.teacher-name {
  font-size: 14px;
  color: #909399;
}

.page-main {
  padding: 20px;
}

.filter-card {
  margin-bottom: 16px;
}

.filter-card :deep(.el-card__body) {
  padding-bottom: 2px;
}

.table-card :deep(.el-card__body) {
  padding-top: 0;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-badge {
  margin-left: 4px;
}

.tab-badge :deep(.el-badge__content) {
  font-size: 11px;
}

.el-table {
  margin-top: 12px;
}
</style>
