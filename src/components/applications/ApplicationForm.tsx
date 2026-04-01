'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Profile, Student } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApplicationFormProps {
  students: (Student & { profile: Profile })[]
  onSubmit: (data: any) => Promise<void>
  initialData?: any
  isLoading?: boolean
}

const applicationStatuses = [
  { value: 'draft', label: '준비중' },
  { value: 'submitted', label: '제출완료' },
  { value: 'accepted', label: '합격' },
  { value: 'rejected', label: '불합격' },
  { value: 'waitlisted', label: '대기중' },
]

export function ApplicationForm({
  students,
  onSubmit,
  initialData,
  isLoading = false,
}: ApplicationFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const [formData, setFormData] = useState({
    student_id: initialData?.student_id || '',
    university_name: initialData?.university_name || '',
    major: initialData?.major || '',
    application_date: initialData?.application_date?.split('T')[0] || '',
    status: initialData?.status || 'draft',
    notes: initialData?.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !formData.student_id ||
      !formData.university_name ||
      !formData.major ||
      !formData.application_date
    ) {
      toast({
        title: '오류',
        description: '필수 항목을 모두 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        student_id: formData.student_id,
        university_name: formData.university_name,
        major: formData.major,
        application_date: new Date(formData.application_date).toISOString(),
        status: formData.status,
        notes: formData.notes,
      })

      toast({
        title: '성공',
        description: '지원 현황이 저장되었습니다.',
      })

      router.push('/dashboard/applications')
      router.refresh()
    } catch (error) {
      toast({
        title: '오류',
        description: '저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedStudent = students.find((s) => s.id === formData.student_id)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="student">학생 선택</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedStudent
                ? selectedStudent.profile.name
                : '학생을 선택해주세요...'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="학생 검색..." />
              <CommandEmpty>학생을 찾을 수 없습니다.</CommandEmpty>
              <CommandGroup>
                {students.map((student) => (
                  <CommandItem
                    key={student.id}
                    value={student.id}
                    onSelect={(currentValue) => {
                      setFormData((prev) => ({
                        ...prev,
                        student_id:
                          currentValue === prev.student_id ? '' : currentValue,
                      }))
                      setOpen(false)
                    }}
                  >
                    <CheckCircle2
                      className={cn(
                        'mr-2 h-4 w-4',
                        formData.student_id === student.id
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    {student.profile?.name || '학생'}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label htmlFor="university_name">대학교명</Label>
        <Input
          id="university_name"
          placeholder="예: 서울대학교"
          value={formData.university_name}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              university_name: e.target.value,
            }))
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="major">학과</Label>
        <Input
          id="major"
          placeholder="예: 컴퓨터공학과"
          value={formData.major}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, major: e.target.value }))
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="application_date">마감일</Label>
        <Input
          id="application_date"
          type="date"
          value={formData.application_date}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              application_date: e.target.value,
            }))
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="status">상태</Label>
        <Select value={formData.status} onValueChange={(value) =>
          setFormData((prev) => ({ ...prev, status: value }))
        }>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {applicationStatuses.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">메모</Label>
        <Textarea
          id="notes"
          placeholder="추가 메모나 특이사항을 입력해주세요..."
          value={formData.notes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
          className="min-h-[100px]"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={loading || isLoading}
          className="flex-1"
        >
          {loading ? '저장 중...' : '저장'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex-1"
        >
          취소
        </Button>
      </div>
    </form>
  )
}
